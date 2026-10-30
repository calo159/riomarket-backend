"""Pruebas de moderación de puestos y productos (solo administradores)."""

import pytest

from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Producto, Puesto
from apps.notifications.models import Notificacion
from tests.factories import ProductoFactory, PuestoFactory

PUESTOS = "/api/catalog/puestos/"
PRODUCTOS = "/api/catalog/productos/"


@pytest.mark.django_db
class TestModerarPuesto:
    def test_admin_suspende_y_notifica(self, cliente_admin, puesto, vendedor):
        respuesta = cliente_admin.post(
            f"{PUESTOS}{puesto.pk}/moderar/",
            {"estado": "suspendido", "motivo": "Incumple normas"},
            format="json",
        )
        assert respuesta.status_code == 200
        assert respuesta.data["estado"] == Puesto.Estado.SUSPENDIDO
        puesto.refresh_from_db()
        assert puesto.estado == Puesto.Estado.SUSPENDIDO
        assert Notificacion.objects.filter(id_usuario=vendedor, titulo__icontains="puesto").exists()
        assert RegistroAuditoria.objects.filter(
            entidad="puesto", id_entidad=puesto.pk, detalle__a="suspendido"
        ).exists()

    def test_admin_reactiva(self, cliente_admin, vendedor):
        puesto = PuestoFactory(id_vendedor=vendedor, estado=Puesto.Estado.SUSPENDIDO)
        respuesta = cliente_admin.post(
            f"{PUESTOS}{puesto.pk}/moderar/", {"estado": "activo"}, format="json"
        )
        assert respuesta.status_code == 200
        puesto.refresh_from_db()
        assert puesto.estado == Puesto.Estado.ACTIVO

    def test_vendedor_no_modera(self, cliente_vendedor, puesto):
        respuesta = cliente_vendedor.post(
            f"{PUESTOS}{puesto.pk}/moderar/", {"estado": "suspendido"}, format="json"
        )
        assert respuesta.status_code == 403

    def test_estado_invalido(self, cliente_admin, puesto):
        respuesta = cliente_admin.post(
            f"{PUESTOS}{puesto.pk}/moderar/", {"estado": "borrado"}, format="json"
        )
        assert respuesta.status_code == 400

    def test_mismo_estado(self, cliente_admin, puesto):
        respuesta = cliente_admin.post(
            f"{PUESTOS}{puesto.pk}/moderar/", {"estado": "activo"}, format="json"
        )
        assert respuesta.status_code == 400


@pytest.mark.django_db
class TestModerarProducto:
    def test_admin_bloquea_y_notifica(self, cliente_admin, puesto, vendedor):
        producto = ProductoFactory(id_puesto=puesto)
        respuesta = cliente_admin.post(
            f"{PRODUCTOS}{producto.pk}/moderar/",
            {"estado": "bloqueado", "motivo": "Precio engañoso"},
            format="json",
        )
        assert respuesta.status_code == 200
        assert respuesta.data["estado"] == Producto.Estado.BLOQUEADO
        producto.refresh_from_db()
        assert producto.estado == Producto.Estado.BLOQUEADO
        assert Notificacion.objects.filter(
            id_usuario=vendedor, titulo__icontains="producto"
        ).exists()
        assert RegistroAuditoria.objects.filter(
            entidad="producto", id_entidad=producto.pk, detalle__a="bloqueado"
        ).exists()

    def test_admin_desbloquea(self, cliente_admin, puesto):
        producto = ProductoFactory(id_puesto=puesto, estado=Producto.Estado.BLOQUEADO)
        respuesta = cliente_admin.post(
            f"{PRODUCTOS}{producto.pk}/moderar/", {"estado": "activo"}, format="json"
        )
        assert respuesta.status_code == 200
        producto.refresh_from_db()
        assert producto.estado == Producto.Estado.ACTIVO

    def test_vendedor_no_modera(self, cliente_vendedor, puesto):
        producto = ProductoFactory(id_puesto=puesto)
        respuesta = cliente_vendedor.post(
            f"{PRODUCTOS}{producto.pk}/moderar/", {"estado": "bloqueado"}, format="json"
        )
        assert respuesta.status_code == 403

    def test_vendedor_no_desbloquea_su_producto(self, cliente_vendedor, puesto):
        producto = ProductoFactory(id_puesto=puesto, estado=Producto.Estado.BLOQUEADO)
        respuesta = cliente_vendedor.patch(
            f"{PRODUCTOS}{producto.pk}/", {"estado": "activo"}, format="json"
        )
        assert respuesta.status_code == 403
        producto.refresh_from_db()
        assert producto.estado == Producto.Estado.BLOQUEADO

    def test_vendedor_no_bloquea_su_producto(self, cliente_vendedor, puesto):
        producto = ProductoFactory(id_puesto=puesto)
        respuesta = cliente_vendedor.patch(
            f"{PRODUCTOS}{producto.pk}/", {"estado": "bloqueado"}, format="json"
        )
        assert respuesta.status_code == 403
        producto.refresh_from_db()
        assert producto.estado == Producto.Estado.ACTIVO

    def test_estado_invalido(self, cliente_admin, puesto):
        producto = ProductoFactory(id_puesto=puesto)
        respuesta = cliente_admin.post(
            f"{PRODUCTOS}{producto.pk}/moderar/", {"estado": "eliminado"}, format="json"
        )
        assert respuesta.status_code == 400
