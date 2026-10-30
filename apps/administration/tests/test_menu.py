"""Pruebas del menú dinámico por rol."""

import pytest
from django.utils import timezone

from apps.accounts.models import Usuario
from apps.orders.models import Pedido
from tests.factories import NotificacionFactory, PedidoFactory, VendedorPendienteFactory

MENU = "/api/auth/menu/"


def rutas(enlaces):
    return {enlace["to"] for enlace in enlaces}


def rutas_panel(panel):
    return {enlace["to"] for grupo in panel for enlace in grupo["items"]}


@pytest.mark.django_db
class TestMenu:
    def test_anonimo_recibe_solo_publico(self, cliente_anon):
        respuesta = cliente_anon.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "anonimo"
        assert rutas(respuesta.data["publico"]) == {"/catalogo"}
        assert respuesta.data["cuenta"] == []
        assert respuesta.data["panel"] == []
        assert respuesta.data["badges"] == {}

    def test_comprador(self, cliente_comprador):
        respuesta = cliente_comprador.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "comprador"
        assert respuesta.data["inicio"] == "/"
        assert respuesta.data["panel"] == []
        assert respuesta.data["panel_titulo"] is None
        assert rutas(respuesta.data["publico"]) == {"/catalogo", "/mis-pedidos"}
        assert rutas(respuesta.data["cuenta"]) == {
            "/perfil",
            "/direcciones",
            "/notificaciones",
        }
        assert "/admin/usuarios" not in rutas(respuesta.data["publico"])

    def test_vendedor(self, cliente_vendedor):
        respuesta = cliente_vendedor.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "vendedor"
        assert respuesta.data["inicio"] == "/vendedor"
        assert respuesta.data["panel_titulo"] == "Panel de vendedor"
        assert rutas_panel(respuesta.data["panel"]) == {
            "/vendedor",
            "/vendedor/verificacion",
            "/vendedor/puestos",
            "/vendedor/productos",
            "/vendedor/pedidos",
            "/vendedor/cupones",
            "/vendedor/resenas",
        }
        assert "/admin/usuarios" not in rutas_panel(respuesta.data["panel"])

    def test_administrador_agrupado(self, cliente_admin):
        respuesta = cliente_admin.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "administrador"
        assert respuesta.data["inicio"] == "/admin"
        assert respuesta.data["panel_titulo"] == "Administración"
        grupos = {grupo["grupo"] for grupo in respuesta.data["panel"]}
        assert grupos == {"General", "Gestión", "Operación", "Sistema"}
        panel = rutas_panel(respuesta.data["panel"])
        assert {
            "/admin",
            "/admin/verificaciones",
            "/admin/usuarios",
            "/admin/pedidos",
            "/admin/puestos",
            "/admin/productos",
            "/admin/categorias",
            "/admin/resenas",
            "/admin/pagos",
            "/admin/cupones",
            "/admin/auditoria",
        } <= panel

    def test_enlaces_tienen_forma(self, cliente_admin):
        respuesta = cliente_admin.get(MENU)
        for grupo in respuesta.data["panel"]:
            assert "grupo" in grupo
            for enlace in grupo["items"]:
                assert set(enlace) >= {"to", "etiqueta", "icono"}
                assert enlace["to"].startswith("/")

    def test_badges_comprador(self, cliente_comprador, comprador):
        PedidoFactory(id_comprador=comprador, estado=Pedido.Estado.EN_CAMINO)
        PedidoFactory(id_comprador=comprador, estado=Pedido.Estado.PENDIENTE)
        NotificacionFactory(id_usuario=comprador, leida=False)
        respuesta = cliente_comprador.get(MENU)
        assert respuesta.data["badges"] == {
            "pedidos_por_confirmar": 1,
            "notificaciones": 1,
        }

    def test_badges_vendedor(self, cliente_vendedor, vendedor, puesto):
        PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.PENDIENTE)
        respuesta = cliente_vendedor.get(MENU)
        assert respuesta.data["badges"]["pedidos_pendientes"] == 1

    def test_badges_admin(self, cliente_admin, vendedor):
        VendedorPendienteFactory(
            id_usuario=Usuario.objects.create_user(
                nombre="Pendiente",
                correo="pendiente@test.com",
                celular="3000000000",
                password="clave12345",
                rol=Usuario.Rol.VENDEDOR,
            )
        )
        PedidoFactory(
            id_comprador=Usuario.objects.create_user(
                nombre="Compra",
                correo="compra@test.com",
                celular="3000000001",
                password="clave12345",
            ),
            no_recibido_en=timezone.now(),
            estado=Pedido.Estado.EN_CAMINO,
        )
        respuesta = cliente_admin.get(MENU)
        assert respuesta.data["badges"]["verificaciones"] == 1
        assert respuesta.data["badges"]["no_recibidos"] == 1
