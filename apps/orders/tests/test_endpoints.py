"""Pruebas de los endpoints de pedidos (permisos, reglas y filtros)."""

import pytest
from rest_framework import status

from apps.catalog.models import Producto
from apps.orders import services
from apps.orders.models import Pedido
from tests.factories import PedidoFactory

from .conftest import PEDIDOS

CATALOGO_PRODUCTOS = "/api/catalog/productos/"


def _cuerpo(puesto, producto, cantidad=2, **extra):
    datos = {
        "id_puesto": puesto.pk,
        "tipo_entrega": "retiro",
        "items": [{"id_producto": producto.pk, "cantidad": cantidad}],
    }
    datos.update(extra)
    return datos


@pytest.mark.django_db
class TestCreacion:
    def test_anonimo_no_crea(self, cliente_anon, puesto, producto):
        assert cliente_anon.post(PEDIDOS, _cuerpo(puesto, producto)).status_code == 401

    def test_vendedor_no_crea(self, cliente_vendedor, puesto, producto):
        assert cliente_vendedor.post(PEDIDOS, _cuerpo(puesto, producto)).status_code == 403

    def test_comprador_crea_ok(self, cliente_comprador, comprador, puesto, producto):
        respuesta = cliente_comprador.post(PEDIDOS, _cuerpo(puesto, producto), format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["estado"] == "pendiente"
        assert respuesta.data["id_comprador"] == comprador.pk
        assert respuesta.data["subtotal"] == "3000.00"
        assert respuesta.data["total"] == "3000.00"
        assert respuesta.data["items"][0]["nombre_producto"] == producto.nombre
        producto.refresh_from_db()
        assert producto.stock == 8

    def test_stock_insuficiente_400(self, cliente_comprador, puesto, producto):
        respuesta = cliente_comprador.post(
            PEDIDOS, _cuerpo(puesto, producto, cantidad=999), format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "errors" in respuesta.data

    def test_items_vacios_400(self, cliente_comprador, puesto):
        cuerpo = {"id_puesto": puesto.pk, "tipo_entrega": "retiro", "items": []}
        respuesta = cliente_comprador.post(PEDIDOS, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "errors" in respuesta.data

    def test_domicilio_sin_servicio_400(self, cliente_comprador, puesto, producto):
        cuerpo = _cuerpo(
            puesto,
            producto,
            tipo_entrega="domicilio",
            direccion_entrega="Calle 1 #2-3",
        )
        respuesta = cliente_comprador.post(PEDIDOS, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "tipo_entrega" in str(respuesta.data["errors"])

    def test_montos_los_calcula_el_servidor(self, cliente_comprador, puesto, producto):
        cuerpo = _cuerpo(puesto, producto, cantidad=1, subtotal="1.00", total="999.00")
        respuesta = cliente_comprador.post(PEDIDOS, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["subtotal"] == "1500.00"
        assert respuesta.data["total"] == "1500.00"


@pytest.mark.django_db
class TestListado:
    def test_comprador_solo_ve_los_suyos(self, cliente_comprador, comprador, puesto, producto):
        services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        ajeno = PedidoFactory()  # comprador y puesto distintos
        respuesta = cliente_comprador.get(PEDIDOS)
        assert respuesta.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in respuesta.data["results"]]
        assert ajeno.pk not in ids
        assert len(ids) == 1

    def test_vendedor_solo_ve_pedidos_de_su_puesto(
        self, cliente_vendedor, comprador, puesto, producto
    ):
        services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        ajeno = PedidoFactory()
        respuesta = cliente_vendedor.get(PEDIDOS)
        ids = [p["id"] for p in respuesta.data["results"]]
        assert ajeno.pk not in ids
        assert len(ids) == 1

    def test_admin_ve_todos(self, cliente_admin, comprador, puesto, producto):
        services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        otro = PedidoFactory()
        respuesta = cliente_admin.get(PEDIDOS)
        ids = [p["id"] for p in respuesta.data["results"]]
        assert len(ids) == 2
        assert otro.pk in ids

    def test_filtro_por_estado(self, cliente_comprador, comprador, vendedor, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        respuesta = cliente_comprador.get(PEDIDOS, {"estado": "confirmado"})
        assert [p["id"] for p in respuesta.data["results"]] == [pedido.pk]

    def test_ordering_invalido_400(self, cliente_comprador, comprador, puesto, producto):
        services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_comprador.get(PEDIDOS, {"ordering": "password"})
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDetalle:
    def test_comprador_ve_su_pedido(self, cliente_comprador, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["id"] == pedido.pk

    def test_pedido_ajeno_404(self, cliente_comprador, puesto, producto):
        ajeno = PedidoFactory()
        assert cliente_comprador.get(f"{PEDIDOS}{ajeno.pk}/").status_code == 404

    def test_vendedor_ve_pedidos_de_su_puesto(self, cliente_vendedor, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        assert cliente_vendedor.get(f"{PEDIDOS}{pedido.pk}/").status_code == 200

    def test_no_hay_delete_ni_put(self, cliente_comprador, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        assert cliente_comprador.delete(f"{PEDIDOS}{pedido.pk}/").status_code == 405
        assert cliente_comprador.put(f"{PEDIDOS}{pedido.pk}/", {}, format="json").status_code == 405


@pytest.mark.django_db
class TestEdicion:
    def test_comprador_edita_notas(self, cliente_comprador, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_comprador.patch(
            f"{PEDIDOS}{pedido.pk}/", {"notas": "Llamar al llegar"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        pedido.refresh_from_db()
        assert pedido.notas == "Llamar al llegar"

    def test_estado_es_solo_lectura(self, cliente_comprador, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_comprador.patch(
            f"{PEDIDOS}{pedido.pk}/", {"estado": "entregado"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        pedido.refresh_from_db()
        assert pedido.estado == Pedido.Estado.PENDIENTE

    def test_vendedor_no_edita(self, cliente_vendedor, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_vendedor.patch(
            f"{PEDIDOS}{pedido.pk}/", {"notas": "hack"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_no_edita_un_pedido_confirmado(
        self, cliente_comprador, comprador, vendedor, puesto, producto
    ):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        respuesta = cliente_comprador.patch(
            f"{PEDIDOS}{pedido.pk}/", {"notas": "tarde"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "estado" in str(respuesta.data["errors"])


@pytest.mark.django_db
class TestTransiciones:
    def test_vendedor_confirma(self, cliente_vendedor, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/confirmar/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["estado"] == "confirmado"

    def test_comprador_no_confirma(self, cliente_comprador, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        assert cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/confirmar/").status_code == 403

    def test_flujo_completo_por_api(
        self, cliente_comprador, cliente_vendedor, comprador, vendedor, puesto, producto
    ):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        for accion, cliente in (
            ("confirmar", cliente_vendedor),
            ("en-preparacion", cliente_vendedor),
            ("enviar", cliente_vendedor),
            ("entregar", cliente_comprador),
        ):
            respuesta = cliente.post(f"{PEDIDOS}{pedido.pk}/{accion}/")
            assert respuesta.status_code == status.HTTP_200_OK, respuesta.data
        pedido.refresh_from_db()
        assert pedido.estado == Pedido.Estado.ENTREGADO

    def test_salto_de_estado_400(self, cliente_vendedor, comprador, puesto, producto):
        pedido = services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/enviar/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "estado" in str(respuesta.data["errors"])

    def test_cancelar_repone_stock(self, cliente_comprador, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=_datos(puesto, producto, cantidad=2)
        )
        producto.refresh_from_db()
        assert producto.stock == 8
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/cancelar/")
        assert respuesta.status_code == status.HTTP_200_OK
        producto.refresh_from_db()
        assert producto.stock == 10

    def test_transicion_sobre_pedido_ajeno_404(self, cliente_vendedor, producto):
        ajeno = PedidoFactory()
        assert cliente_vendedor.post(f"{PEDIDOS}{ajeno.pk}/confirmar/").status_code == 404


@pytest.mark.django_db
class TestHistorialProtegido:
    def test_no_se_elimina_un_producto_con_pedidos(
        self, cliente_vendedor, cliente_comprador, comprador, puesto, producto
    ):
        services.crear_pedido(usuario=comprador, datos=_datos(puesto, producto))
        respuesta = cliente_vendedor.delete(f"{CATALOGO_PRODUCTOS}{producto.pk}/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "no_eliminable" in str(respuesta.data["errors"])
        assert Producto.objects.filter(pk=producto.pk).exists()


def _datos(puesto, producto, cantidad=1):
    """Datos de ``services.crear_pedido`` para los tests de integración."""
    return {
        "id_puesto": puesto,
        "tipo_entrega": "retiro",
        "items": [{"id_producto": producto, "cantidad": cantidad}],
    }
