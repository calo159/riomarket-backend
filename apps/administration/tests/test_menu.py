"""Pruebas del menú dinámico por rol."""

import pytest

MENU = "/api/auth/menu/"


def rutas(enlaces):
    return {enlace["to"] for enlace in enlaces}


@pytest.mark.django_db
class TestMenu:
    def test_anonimo_no_accede(self, cliente_anon):
        assert cliente_anon.get(MENU).status_code in (401, 403)

    def test_comprador(self, cliente_comprador):
        respuesta = cliente_comprador.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "comprador"
        assert respuesta.data["inicio"] == "/"
        assert respuesta.data["panel"] == []
        assert respuesta.data["panel_titulo"] is None
        assert rutas(respuesta.data["principal"]) == {"/catalogo", "/mis-pedidos"}
        assert rutas(respuesta.data["cuenta"]) == {
            "/perfil",
            "/mis-pedidos",
            "/direcciones",
            "/notificaciones",
        }

    def test_vendedor(self, cliente_vendedor):
        respuesta = cliente_vendedor.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "vendedor"
        assert respuesta.data["inicio"] == "/vendedor"
        assert respuesta.data["panel_titulo"] == "Panel de vendedor"
        assert rutas(respuesta.data["panel"]) == {
            "/vendedor",
            "/vendedor/verificacion",
            "/vendedor/puestos",
            "/vendedor/productos",
            "/vendedor/pedidos",
            "/vendedor/cupones",
            "/vendedor/resenas",
        }
        assert "/admin/usuarios" not in rutas(respuesta.data["principal"])

    def test_administrador(self, cliente_admin):
        respuesta = cliente_admin.get(MENU)
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == "administrador"
        assert respuesta.data["inicio"] == "/admin"
        assert respuesta.data["panel_titulo"] == "Administración"
        panel = rutas(respuesta.data["panel"])
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
        for enlace in respuesta.data["panel"]:
            assert set(enlace) >= {"to", "etiqueta", "icono"}
            assert enlace["to"].startswith("/")
