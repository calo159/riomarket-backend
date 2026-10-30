"""La caché de recursos vale solo dentro de una petición y nunca sirve permisos obsoletos."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.rbac.acceso import cache_por_peticion, recursos_de_usuario, tiene_recurso
from apps.rbac.models import RolRecurso
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db


def test_sin_peticion_cada_llamada_consulta():
    admin = UsuarioFactory(rol="administrador")
    with CaptureQueriesContext(connection) as contexto:
        for _ in range(3):
            tiene_recurso(admin, "admin.puestos")
    assert len(contexto) == 3


def test_dentro_de_la_peticion_se_consulta_una_sola_vez():
    admin = UsuarioFactory(rol="administrador")
    with cache_por_peticion(), CaptureQueriesContext(connection) as contexto:
        resultados = [tiene_recurso(admin, c) for c in ("admin.puestos", "admin.productos")]
        resultados.append(tiene_recurso(admin, "admin.puestos"))
        assert "admin.puestos" in recursos_de_usuario(admin)
    assert all(resultados)
    assert len(contexto) == 1


def test_la_cache_no_pasa_a_la_peticion_siguiente():
    admin = UsuarioFactory(rol="administrador")
    with cache_por_peticion():
        assert tiene_recurso(admin, "admin.auditoria")
    RolRecurso.objects.filter(
        id_rol__nombre="administrador", id_recurso__codigo="admin.auditoria"
    ).delete()
    with cache_por_peticion():
        assert not tiene_recurso(admin, "admin.auditoria")


def test_un_cambio_dentro_de_la_peticion_invalida_la_cache():
    admin = UsuarioFactory(rol="administrador")
    with cache_por_peticion():
        assert tiene_recurso(admin, "admin.auditoria")
        RolRecurso.objects.filter(
            id_rol__nombre="administrador", id_recurso__codigo="admin.auditoria"
        ).delete()
        assert not tiene_recurso(admin, "admin.auditoria")


def test_la_cache_distingue_usuarios():
    admin = UsuarioFactory(rol="administrador")
    comprador = UsuarioFactory(rol="comprador")
    with cache_por_peticion():
        assert tiene_recurso(admin, "admin.puestos")
        assert not tiene_recurso(comprador, "admin.puestos")


def test_endpoint_no_sirve_permisos_obsoletos_entre_peticiones():
    from rest_framework.test import APIClient

    admin = UsuarioFactory(rol="administrador")
    cliente = APIClient()
    cliente.force_authenticate(admin)
    assert cliente.get("/api/admin/usuarios/").status_code == 200
    RolRecurso.objects.filter(
        id_rol__nombre="administrador", id_recurso__codigo="admin.usuarios"
    ).delete()
    assert cliente.get("/api/admin/usuarios/").status_code == 403
