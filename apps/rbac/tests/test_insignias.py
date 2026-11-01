"""Las insignias del menú las registra cada app dueña del dato; ``rbac`` no conoce el dominio."""

import pytest

from apps.rbac import menu

pytestmark = pytest.mark.django_db


def test_las_apps_de_negocio_registran_sus_insignias_al_arrancar():
    assert {
        "mis_pedidos",
        "vendedor.pedidos",
        "admin.pedidos",
        "admin.pagos",
        "notificaciones",
        "admin.verificaciones",
    } <= set(menu._INSIGNIAS)


def test_una_insignia_registrada_aparece_solo_si_el_usuario_ve_ese_recurso(monkeypatch):
    monkeypatch.setitem(menu._INSIGNIAS, "recurso.de.prueba", lambda usuario: 7)
    usuario = object()

    assert menu._badges(usuario, {"recurso.de.prueba"}).get("recurso.de.prueba") == 7
    assert "recurso.de.prueba" not in menu._badges(usuario, {"otro.recurso"})


def test_registrar_dos_veces_el_mismo_codigo_reemplaza_sin_duplicar(monkeypatch):
    monkeypatch.setattr(menu, "_INSIGNIAS", {})

    menu.registrar_insignia("a", lambda usuario: 1)
    menu.registrar_insignia("a", lambda usuario: 2)

    assert menu._badges(object(), {"a"}) == {"a": 2}
