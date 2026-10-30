"""Núcleo RBAC: siembra, sincronización del rol base y permisos efectivos."""

import pytest
from django.contrib.auth.models import AnonymousUser
from django.core.management import call_command
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from apps.rbac.acceso import recursos_de_usuario, tiene_recurso
from apps.rbac.defaults import RECURSOS_POR_DEFECTO, ROLES_BASE, sembrar
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from apps.rbac.permissions import TieneRecurso
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db


def _codigos(rol):
    return set(rol.recursos.values_list("codigo", flat=True))


class TestSiembra:
    def test_migracion_deja_roles_y_recursos(self):
        assert set(Rol.objects.filter(es_sistema=True).values_list("nombre", flat=True)) == set(
            ROLES_BASE
        )
        assert Recurso.objects.count() == len(RECURSOS_POR_DEFECTO)
        assert "admin.roles" in _codigos(Rol.objects.get(nombre="administrador"))
        assert "mis_pedidos" in _codigos(Rol.objects.get(nombre="comprador"))
        assert "vendedor.pedidos" in _codigos(Rol.objects.get(nombre="vendedor"))
        assert "perfil" in _codigos(Rol.objects.get(nombre="vendedor"))
        assert Recurso.objects.get(codigo="catalogo").es_publico

    def test_idempotente_y_respeta_ediciones(self):
        admin = Rol.objects.get(nombre="administrador")
        RolRecurso.objects.filter(id_rol=admin, id_recurso__codigo="admin.auditoria").delete()
        Recurso.objects.filter(codigo="perfil").update(nombre="Cuenta")
        total = Recurso.objects.count()

        assert sembrar(Rol, Recurso, RolRecurso) == 0
        call_command("seed_rbac")

        assert Recurso.objects.count() == total
        assert "admin.auditoria" not in _codigos(admin)
        assert Recurso.objects.get(codigo="perfil").nombre == "Cuenta"


class TestSincronizacion:
    @pytest.mark.parametrize("rol", ROLES_BASE)
    def test_usuario_nuevo_recibe_su_fila(self, rol):
        usuario = UsuarioFactory(rol=rol)
        filas = UsuarioRol.objects.filter(id_usuario=usuario)
        assert [f.id_rol.nombre for f in filas] == [rol]

    def test_cambiar_rol_sincroniza_y_conserva_adicionales(self):
        usuario = UsuarioFactory(rol="comprador")
        extra = Rol.objects.create(nombre="moderador")
        UsuarioRol.objects.create(id_usuario=usuario, id_rol=extra)

        usuario.rol = "vendedor"
        usuario.save(update_fields=["rol"])

        nombres = set(
            UsuarioRol.objects.filter(id_usuario=usuario).values_list("id_rol__nombre", flat=True)
        )
        assert nombres == {"vendedor", "moderador"}


class TestPermisosEfectivos:
    def test_por_rol_base(self):
        assert "mis_pedidos" in recursos_de_usuario(UsuarioFactory(rol="comprador"))
        assert "admin.usuarios" not in recursos_de_usuario(UsuarioFactory(rol="comprador"))
        assert "vendedor.puestos" in recursos_de_usuario(UsuarioFactory(rol="vendedor"))
        assert "admin.usuarios" in recursos_de_usuario(UsuarioFactory(rol="administrador"))

    def test_anonimo_solo_publicos(self):
        assert recursos_de_usuario(AnonymousUser()) == {"catalogo"}

    def test_suspendido_solo_publicos(self):
        usuario = UsuarioFactory(rol="administrador", estado="suspendido")
        assert recursos_de_usuario(usuario) == {"catalogo"}

    def test_rol_adicional_suma(self):
        usuario = UsuarioFactory(rol="comprador")
        rol = Rol.objects.create(nombre="moderador")
        RolRecurso.objects.create(
            id_rol=rol, id_recurso=Recurso.objects.get(codigo="admin.puestos")
        )
        UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
        assert "admin.puestos" in recursos_de_usuario(usuario)
        assert "mis_pedidos" in recursos_de_usuario(usuario)

    def test_rol_inactivo_no_otorga(self):
        usuario = UsuarioFactory(rol="comprador")
        rol = Rol.objects.create(nombre="moderador", activo=False)
        RolRecurso.objects.create(
            id_rol=rol, id_recurso=Recurso.objects.get(codigo="admin.puestos")
        )
        UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
        assert not tiene_recurso(usuario, "admin.puestos")

    def test_recurso_inactivo_no_se_otorga(self):
        Recurso.objects.filter(codigo="mis_pedidos").update(activo=False)
        assert not tiene_recurso(UsuarioFactory(rol="comprador"), "mis_pedidos")

    def test_quitar_recurso_al_rol_administrador_niega_de_verdad(self):
        admin = UsuarioFactory(rol="administrador")
        assert tiene_recurso(admin, "admin.auditoria")
        RolRecurso.objects.filter(
            id_rol__nombre="administrador", id_recurso__codigo="admin.auditoria"
        ).delete()
        assert not tiene_recurso(admin, "admin.auditoria")


class _Vista(APIView):
    permission_classes = [TieneRecurso("admin.usuarios")]

    def get(self, request):
        return Response({"ok": True})


class TestTieneRecurso:
    def _llamar(self, usuario=None):
        peticion = APIRequestFactory().get("/x/")
        if usuario:
            force_authenticate(peticion, usuario)
        return _Vista.as_view()(peticion)

    def test_sin_sesion_401(self):
        respuesta = APIClient().get("/api/admin/usuarios/")
        assert respuesta.status_code == 401

    def test_sin_recurso_403(self):
        assert self._llamar(UsuarioFactory(rol="comprador")).status_code == 403

    def test_con_recurso_200(self):
        assert self._llamar(UsuarioFactory(rol="administrador")).status_code == 200
