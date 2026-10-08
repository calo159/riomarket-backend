"""Pruebas de los modelos de pedidos (limpieza, constraints y helpers)."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.orders.models import Pedido
from tests.factories import ItemPedidoFactory, PedidoFactory


def pedido_instancia(comprador, puesto, **campos):
    """Pedido SIN guardar: permite probar la validación sin chocar con los CHECK."""
    base = {
        "id_comprador": comprador,
        "id_puesto": puesto,
        "subtotal": Decimal("1000.00"),
        "tarifa_domicilio": Decimal("0.00"),
        "total": Decimal("1000.00"),
    }
    base.update(campos)
    return Pedido(**base)


@pytest.mark.django_db
class TestPedido:
    def test_total_de_ser_subtotal_mas_tarifa(self, comprador, puesto):
        pedido = pedido_instancia(comprador, puesto, total=Decimal("999.00"))
        with pytest.raises(DjangoValidationError) as error:
            pedido.full_clean()
        assert "total" in error.value.message_dict

    def test_domicilio_requiere_direccion(self, comprador, puesto):
        pedido = pedido_instancia(
            comprador,
            puesto,
            tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
            direccion_entrega="  ",
        )
        with pytest.raises(DjangoValidationError) as error:
            pedido.full_clean()
        assert "direccion_entrega" in error.value.message_dict

    def test_retiro_sin_direccion_es_valido(self, comprador, puesto):
        pedido_instancia(comprador, puesto).full_clean()  # no lanza

    def test_estado_invalido(self, comprador, puesto):
        pedido = pedido_instancia(comprador, puesto, estado="inventado")
        with pytest.raises(DjangoValidationError) as error:
            pedido.full_clean()
        assert "estado" in error.value.message_dict

    def test_es_final(self, comprador, puesto):
        pedido = pedido_instancia(comprador, puesto, estado=Pedido.Estado.ENTREGADO)
        assert pedido.es_final is True
        pedido.estado = Pedido.Estado.PENDIENTE
        assert pedido.es_final is False

    def test_str(self, comprador, puesto):
        pedido = pedido_instancia(comprador, puesto, pk=7)
        assert str(pedido) == "Pedido #7 (pendiente)"


@pytest.mark.django_db
class TestItemPedido:
    def test_subtotal_es_precio_por_cantidad(self):
        item = ItemPedidoFactory(precio_unitario=Decimal("1500.00"), cantidad=3)
        assert item.subtotal == Decimal("4500.00")

    def test_cantidad_minima(self):
        item = ItemPedidoFactory.build(cantidad=0)
        with pytest.raises(DjangoValidationError):
            item.full_clean()

    def test_producto_repetido_en_el_mismo_pedido(self):
        existente = ItemPedidoFactory()
        duplicado = ItemPedidoFactory.build(
            id_pedido=existente.id_pedido, id_producto=existente.id_producto
        )
        with pytest.raises(DjangoValidationError):
            duplicado.full_clean()

    def test_precio_negativo(self):
        item = ItemPedidoFactory.build(precio_unitario=Decimal("-1.00"))
        with pytest.raises(DjangoValidationError):
            item.full_clean()

    def test_str(self):
        item = ItemPedidoFactory(cantidad=2)
        assert str(item) == f"2 x {item.nombre_producto}"


@pytest.mark.django_db
class TestPedidoFactory:
    def test_factory_crea_pedido_consistente(self):
        pedido = PedidoFactory()
        assert pedido.total == pedido.subtotal + pedido.tarifa_domicilio
        assert pedido.estado == Pedido.Estado.PENDIENTE
