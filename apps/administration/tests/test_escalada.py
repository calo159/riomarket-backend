"""Hallazgo S-12: quien no es administrador base no puede darse más recursos de los que tiene."""

import pytest
from rest_framework.test import APIClient

from apps.rbac.acceso import recursos_de_usuario
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db


def _gestor():
    """Usuario con admin.roles y admin.usuarios pero sin ser administrador base."""
    usuario = UsuarioFactory()
    rol = Rol.objects.create(nombre=f"gestor{usuario.pk}")
    for recurso in Recurso.objects.filter(codigo__in=["admin.roles", "admin.usuarios"]):
        RolRecurso.objects.create(id_rol=rol, id_recurso=recurso)
    UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return usuario, cliente


def _ids(*codigos):
    return list(Recurso.objects.filter(codigo__in=codigos).values_list("id", flat=True))


def test_no_puede_otorgar_recursos_que_no_tiene():
    _, cliente = _gestor()
    otro = Rol.objects.create(nombre="otro")
    respuesta = cliente.put(
        f"/api/admin/roles/{otro.pk}/recursos/",
        {"recursos": _ids("admin.auditoria", "admin.pagos"), "motivo": "Escalada de privilegios"},
        format="json",
    )
    assert respuesta.status_code == 403
    assert otro.recursos.count() == 0


def test_puede_otorgar_un_subconjunto_de_sus_recursos():
    _, cliente = _gestor()
    otro = Rol.objects.create(nombre="otro")
    respuesta = cliente.put(
        f"/api/admin/roles/{otro.pk}/recursos/",
        {"recursos": _ids("admin.usuarios"), "motivo": "Delegar usuarios"},
        format="json",
    )
    assert respuesta.status_code == 200


@pytest.mark.parametrize("nombre", ["comprador", "vendedor"])
def test_no_puede_editar_los_recursos_de_roles_de_sistema(nombre):
    _, cliente = _gestor()
    rol = Rol.objects.get(nombre=nombre)
    respuesta = cliente.put(
        f"/api/admin/roles/{rol.pk}/recursos/",
        {"recursos": _ids("admin.usuarios"), "motivo": "Todos serían administradores"},
        format="json",
    )
    assert respuesta.status_code == 403
    comprador = UsuarioFactory(rol="comprador")
    assert "admin.usuarios" not in recursos_de_usuario(comprador)


def test_el_administrador_base_conserva_toda_su_libertad():
    admin = UsuarioFactory(rol="administrador")
    cliente = APIClient()
    cliente.force_authenticate(admin)
    rol = Rol.objects.get(nombre="comprador")
    base = list(rol.recursos.values_list("id", flat=True))
    respuesta = cliente.put(
        f"/api/admin/roles/{rol.pk}/recursos/",
        {"recursos": [*base, *_ids("admin.auditoria")], "motivo": "Ajuste del administrador"},
        format="json",
    )
    assert respuesta.status_code == 200
