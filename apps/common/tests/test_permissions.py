"""Pruebas de las clases de permisos por rol (DRF)."""

from types import SimpleNamespace

import pytest
from rest_framework.test import APIRequestFactory

from apps.accounts.models import Usuario
from apps.common.permissions import (
    EsAdministrador,
    EsComprador,
    EsDuenoOAdmin,
    EsVendedor,
    EsVendedorAprobado,
)
from tests.factories import UsuarioFactory

factory = APIRequestFactory()


def _request(user=None):
    request = factory.get("/")
    request.user = user
    return request


@pytest.mark.django_db
class TestPermisosPorRol:
    def test_anonimo_no_pasa_en_ninguna_clase(self):
        request = _request()
        for clase in (EsComprador, EsVendedor, EsVendedorAprobado, EsAdministrador):
            assert clase().has_permission(request, None) is False, clase.__name__

    def test_comprador_solo_entra_a_es_comprador(self):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        request = _request(comprador)
        assert EsComprador().has_permission(request, None) is True
        assert EsVendedor().has_permission(request, None) is False
        assert EsVendedorAprobado().has_permission(request, None) is False
        assert EsAdministrador().has_permission(request, None) is False

    def test_vendedor_sin_verificacion_pasa_en_fase_1(self):
        # La verificación de cédula llega en el Incremento 2; mientras no
        # exista la fila Vendedor, EsVendedorAprobado deja pasar.
        vendedor = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        request = _request(vendedor)
        assert EsVendedor().has_permission(request, None) is True
        assert EsVendedorAprobado().has_permission(request, None) is True
        assert EsComprador().has_permission(request, None) is False

    def test_vendedor_suspendido_no_pasa(self):
        vendedor = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        vendedor.suspendir()
        request = _request(vendedor)
        assert EsVendedor().has_permission(request, None) is False
        assert EsVendedorAprobado().has_permission(request, None) is False

    def test_comprador_suspendido_no_pasa(self):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        comprador.suspendir()
        assert EsComprador().has_permission(_request(comprador), None) is False

    def test_administrador(self):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        request = _request(admin)
        assert EsAdministrador().has_permission(request, None) is True
        assert EsComprador().has_permission(request, None) is False


@pytest.mark.django_db
class TestEsDuenoOAdmin:
    def test_admin_accede_a_cualquier_objeto(self):
        admin = UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)
        otro = UsuarioFactory()
        assert EsDuenoOAdmin().has_object_permission(_request(admin), None, otro) is True

    def test_dueno_accede_a_su_objeto(self):
        dueno = UsuarioFactory()
        assert EsDuenoOAdmin().has_object_permission(_request(dueno), None, dueno) is True

    def test_no_dueno_no_accede(self):
        dueno = UsuarioFactory()
        otro = UsuarioFactory()
        assert EsDuenoOAdmin().has_object_permission(_request(otro), None, dueno) is False

    def test_encuentra_dueno_por_atributo_fk(self):
        """Objetos tipo Pedido/Puesto exponen al dueño vía FK (id_comprador, etc.)."""
        dueno = UsuarioFactory()
        pedido = SimpleNamespace(id_comprador=dueno)
        otro = UsuarioFactory()
        permiso = EsDuenoOAdmin()
        assert permiso.has_object_permission(_request(dueno), None, pedido) is True
        assert permiso.has_object_permission(_request(otro), None, pedido) is False

    def test_anonimo_no_pasa(self):
        dueno = UsuarioFactory()
        assert EsDuenoOAdmin().has_object_permission(_request(), None, dueno) is False

    def test_objeto_sin_dueno_identificable(self):
        usuario = UsuarioFactory()
        objeto_ajeno = SimpleNamespace(otra_cosa=1)
        assert EsDuenoOAdmin().has_object_permission(_request(usuario), None, objeto_ajeno) is False
