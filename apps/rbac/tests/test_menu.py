"""Menú dinámico: sale de los recursos de los roles del usuario."""

import importlib

import pytest
from django.apps import apps as django_apps
from django.utils import timezone
from rest_framework.test import APIClient

from apps.orders.models import Pedido
from apps.rbac.models import Recurso, Rol, RolRecurso, UsuarioRol
from tests.factories import (
    NotificacionFactory,
    PedidoFactory,
    PuestoFactory,
    UsuarioFactory,
    VendedorFactory,
    VendedorPendienteFactory,
)

MENU = "/api/auth/menu/"
pytestmark = pytest.mark.django_db


def cliente(usuario=None):
    c = APIClient()
    if usuario:
        c.force_authenticate(usuario)
    return c


def codigos(respuesta):
    return {i["codigo"] for i in respuesta.data["items"]}


def ambitos(respuesta):
    return {i["ambito"] for i in respuesta.data["items"]}


class TestMenuPorRol:
    def test_anonimo_solo_publico(self):
        r = cliente().get(MENU)
        assert r.status_code == 200
        assert r.data["rol"] == "anonimo"
        assert r.data["roles"] == []
        assert codigos(r) == {"catalogo"}
        assert r.data["badges"] == {}

    def test_comprador(self):
        r = cliente(UsuarioFactory(rol="comprador")).get(MENU)
        assert codigos(r) == {"catalogo", "mis_pedidos", "direcciones", "notificaciones", "perfil"}
        assert "panel_admin" not in ambitos(r) and "panel_vendedor" not in ambitos(r)
        assert r.data["roles"] == ["comprador"]

    def test_vendedor(self):
        r = cliente(UsuarioFactory(rol="vendedor")).get(MENU)
        assert {"vendedor.resumen", "vendedor.pedidos", "perfil", "notificaciones"} <= codigos(r)
        assert "mis_pedidos" not in codigos(r)
        assert "panel_admin" not in ambitos(r)

    def test_administrador(self):
        r = cliente(UsuarioFactory(rol="administrador")).get(MENU)
        assert "admin.usuarios" in codigos(r) and "admin.auditoria" in codigos(r)
        assert "panel_vendedor" not in ambitos(r)
        item = next(i for i in r.data["items"] if i["codigo"] == "admin.usuarios")
        assert item == {
            "codigo": "admin.usuarios",
            "nombre": "Usuarios",
            "ruta": "/admin/usuarios",
            "icono": "Users",
            "ambito": "panel_admin",
            "grupo": "Accesos",
            "orden": 1,
        }

    def test_orden_por_ambito_grupo_y_orden(self):
        r = cliente(UsuarioFactory(rol="administrador")).get(MENU)
        claves = [(i["ambito"], i["grupo"], i["orden"]) for i in r.data["items"]]
        assert claves == sorted(claves)

    def test_suspendido_solo_publico(self):
        r = cliente(UsuarioFactory(rol="administrador", estado="suspendido")).get(MENU)
        assert codigos(r) == {"catalogo"}
        assert r.data["roles"] == []
        assert r.data["badges"] == {}


class TestMenuDinamico:
    def test_rol_personalizado_agrega_items(self):
        u = UsuarioFactory()
        rol = Rol.objects.create(nombre="moderador")
        for rec in Recurso.objects.filter(codigo__in=["admin.puestos", "admin.productos"]):
            RolRecurso.objects.create(id_rol=rol, id_recurso=rec)
        UsuarioRol.objects.create(id_usuario=u, id_rol=rol)
        r = cliente(u).get(MENU)
        assert {"admin.puestos", "admin.productos", "mis_pedidos"} <= codigos(r)
        assert "admin.usuarios" not in codigos(r)
        assert r.data["roles"] == ["comprador", "moderador"]

    def test_cambiar_rol_base_cambia_el_menu(self):
        u = UsuarioFactory(rol="comprador")
        assert "mis_pedidos" in codigos(cliente(u).get(MENU))
        u.rol = "vendedor"
        u.save(update_fields=["rol"])
        r = cliente(u).get(MENU)
        assert "mis_pedidos" not in codigos(r) and "vendedor.puestos" in codigos(r)

    def test_recurso_inactivo_y_sin_ruta_no_aparecen(self):
        Recurso.objects.filter(codigo="direcciones").update(activo=False)
        Recurso.objects.filter(codigo="perfil").update(ruta="")
        r = cliente(UsuarioFactory()).get(MENU)
        assert "direcciones" not in codigos(r)
        assert "perfil" not in {i["codigo"] for i in r.data["items"]}
        assert "perfil" in r.data["recursos"]

    def test_quitar_recurso_a_un_rol_cambia_el_menu(self):
        u = UsuarioFactory()
        RolRecurso.objects.filter(id_rol__nombre="comprador", id_recurso__codigo="perfil").delete()
        assert "perfil" not in codigos(cliente(u).get(MENU))


class TestBadges:
    def test_comprador(self):
        u = UsuarioFactory()
        PedidoFactory(id_comprador=u, estado=Pedido.Estado.EN_CAMINO)
        PedidoFactory(id_comprador=u, estado=Pedido.Estado.ENTREGADO)
        NotificacionFactory(id_usuario=u, leida=False)
        NotificacionFactory(id_usuario=u, leida=True)
        r = cliente(u).get(MENU)
        assert r.data["badges"] == {"mis_pedidos": 1, "notificaciones": 1}

    def test_vendedor(self):
        v = UsuarioFactory(rol="vendedor")
        VendedorFactory(id_usuario=v)
        puesto = PuestoFactory(id_vendedor=v)
        PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.PENDIENTE)
        PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.CONFIRMADO)
        r = cliente(v).get(MENU)
        assert r.data["badges"]["vendedor.pedidos"] == 1
        assert "admin.verificaciones" not in r.data["badges"]

    def test_admin(self):
        VendedorPendienteFactory()
        PedidoFactory(estado=Pedido.Estado.EN_CAMINO, no_recibido_en=timezone.now())
        PedidoFactory(estado=Pedido.Estado.ENTREGADO, no_recibido_en=timezone.now())
        r = cliente(UsuarioFactory(rol="administrador")).get(MENU)
        assert r.data["badges"]["admin.verificaciones"] == 1
        assert r.data["badges"]["admin.pedidos"] == 1
        assert r.data["badges"]["admin.pagos"] == 0
        assert "mis_pedidos" not in r.data["badges"]

    def test_consultas_acotadas(self, django_assert_max_num_queries):
        u = UsuarioFactory(rol="administrador")
        c = cliente(u)
        with django_assert_max_num_queries(12):
            assert c.get(MENU).status_code == 200


class TestRecursoVentas:
    def test_vendedor_tiene_el_recurso_ventas(self):
        r = cliente(UsuarioFactory(rol="vendedor")).get(MENU)
        item = next(i for i in r.data["items"] if i["codigo"] == "vendedor.ventas")
        assert item["ruta"] == "/vendedor/ventas"
        assert item["icono"] == "BarChart3"
        assert item["ambito"] == "panel_vendedor"
        # Va justo después del resumen y antes de la verificación.
        panel = [i["codigo"] for i in r.data["items"] if i["ambito"] == "panel_vendedor"]
        assert panel[:3] == ["vendedor.resumen", "vendedor.ventas", "vendedor.verificacion"]

    def test_comprador_y_administrador_no_lo_reciben(self):
        assert "vendedor.ventas" not in codigos(cliente(UsuarioFactory(rol="comprador")).get(MENU))
        assert "vendedor.ventas" not in codigos(
            cliente(UsuarioFactory(rol="administrador")).get(MENU)
        )

    def test_migracion_recurso_ventas_es_idempotente(self):
        migracion = importlib.import_module("apps.rbac.migrations.0003_recurso_vendedor_ventas")
        # Estado de una base anterior al paquete: sin el recurso y con los órdenes viejos.
        Recurso.objects.filter(codigo="vendedor.ventas").delete()
        for codigo, (antes, _despues) in migracion.CORRIMIENTO.items():
            Recurso.objects.filter(codigo=codigo).update(orden=antes)
        # El administrador ya había movido a mano un recurso: se respeta.
        Recurso.objects.filter(codigo="vendedor.cupones").update(orden=40)
        total = Recurso.objects.count()

        migracion.agregar_ventas(django_apps, None)
        migracion.agregar_ventas(django_apps, None)

        assert Recurso.objects.count() == total + 1
        ventas = Recurso.objects.get(codigo="vendedor.ventas")
        assert ventas.orden == 2 and ventas.ruta == "/vendedor/ventas"
        assert set(ventas.roles.values_list("nombre", flat=True)) == {"vendedor"}
        ordenes = dict(
            Recurso.objects.filter(codigo__startswith="vendedor.").values_list("codigo", "orden")
        )
        assert ordenes["vendedor.verificacion"] == 3
        assert ordenes["vendedor.resenas"] == 8
        assert ordenes["vendedor.cupones"] == 40
        # Sin el vínculo con el rol que el administrador quitó, no se vuelve a crear.
        RolRecurso.objects.filter(id_recurso=ventas).delete()
        migracion.agregar_ventas(django_apps, None)
        assert not ventas.roles.exists()

        migracion.quitar_ventas(django_apps, None)
        assert not Recurso.objects.filter(codigo="vendedor.ventas").exists()
        assert Recurso.objects.get(codigo="vendedor.verificacion").orden == 2
