"""Migraciones de productos por encargo (catalog.0008 y orders.0011).

No llevan ``RunPython``: los campos nuevos nacen con un valor por defecto («stock», ``""``,
``NULL``), de modo que las filas que ya existían quedan correctas sin tocarlas. Estas pruebas
lo comprueban de verdad: se rebobina el esquema, se avanza y se mira qué quedó; y se verifica
que las restricciones nuevas existan y que revertir sea posible.
"""

import pytest
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor

from apps.catalog.models import Producto
from apps.orders.models import ItemPedido, Pedido
from tests.factories import ItemPedidoFactory, PedidoFactory, ProductoFactory

CATALOGO_ANTES = ("catalog", "0007_puesto_plazo_retiro_horas")
CATALOGO_DESPUES = ("catalog", "0008_producto_encargo")
PEDIDOS_ANTES = ("orders", "0010_vence_en_de_pedidos_abiertos")
PEDIDOS_DESPUES = ("orders", "0011_encargos")


def _migrar(*destinos):
    ejecutor = MigrationExecutor(connection)
    ejecutor.migrate(list(destinos))


def _dejar_en_el_ultimo_estado():
    ejecutor = MigrationExecutor(connection)
    ejecutor.migrate(ejecutor.loader.graph.leaf_nodes())


def _columnas(tabla):
    with connection.cursor() as cursor:
        return {c.name for c in connection.introspection.get_table_description(cursor, tabla)}


@pytest.mark.django_db(transaction=True)
def test_items_existentes_quedan_como_stock():
    producto = ProductoFactory()
    pedido = PedidoFactory(id_puesto=producto.id_puesto)
    item = ItemPedidoFactory(id_pedido=pedido, id_producto=producto, cantidad=2)
    try:
        # Atrás: el esquema de antes de los encargos (las columnas nuevas desaparecen).
        _migrar(PEDIDOS_ANTES, CATALOGO_ANTES)
        assert "modalidad" not in _columnas("orders_itempedido")
        assert "detalles" not in _columnas("orders_itempedido")
        assert "fecha_solicitada" not in _columnas("orders_pedido")
        assert "modalidad" not in _columnas("catalog_producto")

        # Adelante: lo que ya existía queda como producto de stock, sin detalles ni fecha.
        _migrar(CATALOGO_DESPUES, PEDIDOS_DESPUES)
        producto = Producto.objects.get(pk=producto.pk)
        assert producto.modalidad == "stock"
        assert producto.preparacion_horas is None
        assert producto.pide_detalles is False
        assert producto.etiqueta_detalles == ""
        assert producto.stock == 10  # el stock no se toca
        item = ItemPedido.objects.get(pk=item.pk)
        assert item.modalidad == "stock"
        assert item.detalles == ""
        assert item.cantidad == 2
        assert Pedido.objects.get(pk=pedido.pk).fecha_solicitada is None
    finally:
        _dejar_en_el_ultimo_estado()


@pytest.mark.django_db(transaction=True)
def test_las_migraciones_son_reversibles_y_se_pueden_repetir():
    ItemPedidoFactory()
    try:
        _migrar(PEDIDOS_ANTES, CATALOGO_ANTES)
        _migrar(CATALOGO_DESPUES, PEDIDOS_DESPUES)
        _migrar(PEDIDOS_ANTES, CATALOGO_ANTES)
        _migrar(CATALOGO_DESPUES, PEDIDOS_DESPUES)
        assert ItemPedido.objects.count() == 1
        assert ItemPedido.objects.get().modalidad == "stock"
    finally:
        _dejar_en_el_ultimo_estado()


@pytest.mark.django_db(transaction=True)
def test_las_restricciones_nuevas_existen_en_la_base():
    producto = ProductoFactory()
    with pytest.raises(IntegrityError), transaction.atomic():
        Producto.objects.filter(pk=producto.pk).update(modalidad="encargo", preparacion_horas=None)
    with pytest.raises(IntegrityError), transaction.atomic():
        Producto.objects.filter(pk=producto.pk).update(modalidad="otra")
    item = ItemPedidoFactory()
    with pytest.raises(IntegrityError), transaction.atomic():
        ItemPedido.objects.filter(pk=item.pk).update(modalidad="otra")
