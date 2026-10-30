"""Enforcement por recursos: un rol personalizado accede solo a lo que se le dio."""

import pytest
from rest_framework.test import APIClient

from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Categoria, Producto, Puesto
from apps.notifications.models import Notificacion
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import (
    ProductoFactory,
    PuestoFactory,
    ResenaFactory,
    UsuarioFactory,
    VendedorFactory,
)

pytestmark = pytest.mark.django_db


def con_recursos(*codigos):
    """Comprador con un rol personalizado que otorga los recursos indicados."""
    usuario = UsuarioFactory()
    rol = Rol.objects.create(nombre=f"rol_{usuario.pk}")
    for recurso in Recurso.objects.filter(codigo__in=codigos):
        RolRecurso.objects.create(id_rol=rol, id_recurso=recurso)
    UsuarioRol.objects.create(id_usuario=usuario, id_rol=rol)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


@pytest.fixture
def vendedor():
    usuario = UsuarioFactory(rol="vendedor")
    VendedorFactory(id_usuario=usuario)
    return usuario


class TestModerarPuesto:
    def test_con_recurso_modera_notifica_y_audita(self, vendedor):
        puesto = PuestoFactory(id_vendedor=vendedor)
        r = con_recursos("admin.puestos").post(
            f"/api/catalog/puestos/{puesto.pk}/moderar/",
            {"estado": "suspendido", "motivo": "Publicidad engañosa"},
            format="json",
        )
        assert r.status_code == 200
        puesto.refresh_from_db()
        assert puesto.estado == Puesto.Estado.SUSPENDIDO
        assert Notificacion.objects.filter(id_usuario=vendedor).exists()
        log = RegistroAuditoria.objects.get(entidad="puesto", id_entidad=puesto.pk)
        assert log.detalle["motivo"] == "Publicidad engañosa"

    def test_sin_recurso_403(self, vendedor):
        puesto = PuestoFactory(id_vendedor=vendedor)
        r = con_recursos("admin.productos").post(
            f"/api/catalog/puestos/{puesto.pk}/moderar/",
            {"estado": "suspendido", "motivo": "Sin permiso"},
            format="json",
        )
        assert r.status_code == 403

    def test_motivo_obligatorio_al_restringir_y_opcional_al_reactivar(self, vendedor):
        puesto = PuestoFactory(id_vendedor=vendedor)
        c = con_recursos("admin.puestos")
        url = f"/api/catalog/puestos/{puesto.pk}/moderar/"
        assert c.post(url, {"estado": "suspendido"}, format="json").status_code == 400
        assert (
            c.post(
                url, {"estado": "suspendido", "motivo": "Motivo válido"}, format="json"
            ).status_code
            == 200
        )
        assert c.post(url, {"estado": "activo"}, format="json").status_code == 200


class TestModerarProducto:
    def test_con_recurso_bloquea(self, vendedor):
        producto = ProductoFactory(id_puesto=PuestoFactory(id_vendedor=vendedor))
        r = con_recursos("admin.productos").post(
            f"/api/catalog/productos/{producto.pk}/moderar/",
            {"estado": "bloqueado", "motivo": "Producto prohibido"},
            format="json",
        )
        assert r.status_code == 200
        producto.refresh_from_db()
        assert producto.estado == Producto.Estado.BLOQUEADO

    def test_motivo_obligatorio_y_permiso(self, vendedor):
        producto = ProductoFactory(id_puesto=PuestoFactory(id_vendedor=vendedor))
        url = f"/api/catalog/productos/{producto.pk}/moderar/"
        assert (
            con_recursos("admin.productos")
            .post(url, {"estado": "bloqueado"}, format="json")
            .status_code
            == 400
        )
        sin = con_recursos("admin.puestos").post(
            url, {"estado": "bloqueado", "motivo": "Sin permiso"}, format="json"
        )
        assert sin.status_code == 403

    def test_vendedor_no_desbloquea_ni_bloquea_por_la_api(self, vendedor):
        producto = ProductoFactory(
            id_puesto=PuestoFactory(id_vendedor=vendedor), estado=Producto.Estado.BLOQUEADO
        )
        c = APIClient()
        c.force_authenticate(vendedor)
        r = c.patch(f"/api/catalog/productos/{producto.pk}/", {"estado": "activo"}, format="json")
        assert r.status_code == 403  # el servicio lo rechaza: solo un moderador desbloquea
        producto.refresh_from_db()
        assert producto.estado == Producto.Estado.BLOQUEADO


class TestCategorias:
    def test_con_recurso_escribe_y_sin_recurso_no(self):
        r = con_recursos("admin.categorias").post(
            "/api/catalog/categorias/", {"nombre": "Artesanías wayuu"}, format="json"
        )
        assert r.status_code == 201
        assert Categoria.objects.filter(nombre="Artesanías wayuu").exists()
        r = con_recursos("admin.puestos").post(
            "/api/catalog/categorias/", {"nombre": "Otra categoría"}, format="json"
        )
        assert r.status_code == 403


class TestOtrosRecursos:
    def test_auditoria_exige_su_recurso(self):
        assert con_recursos("admin.auditoria").get("/api/audit/registros/").status_code == 200
        assert con_recursos("admin.usuarios").get("/api/audit/registros/").status_code == 403

    def test_verificaciones_exigen_su_recurso(self):
        url = "/api/verificacion/solicitudes/"
        assert con_recursos("admin.verificaciones").get(url).status_code == 200
        assert con_recursos("admin.usuarios").get(url).status_code == 403

    def test_admin_sin_auditoria_pierde_el_acceso_de_verdad(self):
        from apps.rbac.models import RolRecurso as Vinculo

        admin = UsuarioFactory(rol="administrador")
        c = APIClient()
        c.force_authenticate(admin)
        assert c.get("/api/audit/registros/").status_code == 200
        Vinculo.objects.filter(
            id_rol__nombre="administrador", id_recurso__codigo="admin.auditoria"
        ).delete()
        assert c.get("/api/audit/registros/").status_code == 403

    def test_admin_elimina_resena(self):
        resena = ResenaFactory()
        admin = UsuarioFactory(rol="administrador")
        c = APIClient()
        c.force_authenticate(admin)
        assert c.delete(f"/api/reviews/resenas/{resena.pk}/").status_code in (200, 204)

    def test_rol_con_admin_resenas_elimina_resena(self):
        resena = ResenaFactory()
        r = con_recursos("admin.resenas").delete(f"/api/reviews/resenas/{resena.pk}/")
        assert r.status_code in (200, 204)

    def test_pago_solo_admin_exige_admin_pagos(self):
        url = "/api/payments/pagos/1/anular/"
        assert con_recursos("admin.usuarios").post(url, {}, format="json").status_code == 403
