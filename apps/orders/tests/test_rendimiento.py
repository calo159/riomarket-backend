"""Hallazgos R-03 y R-04: el costo de crear/cancelar un pedido no crece de más con las líneas."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.orders import services
from tests.factories import ProductoFactory

from .test_services import datos_pedido

pytestmark = pytest.mark.django_db
PEDIDOS = "/api/orders/pedidos/"


def _productos(puesto, cantidad):
    categoria = None
    productos = []
    for _ in range(cantidad):
        producto = ProductoFactory(id_puesto=puesto, stock=50)
        categoria = producto.id_categoria
        productos.append(producto)
    return productos, categoria


def _consultas(funcion):
    with CaptureQueriesContext(connection) as contexto:
        funcion()
    return len(contexto)


def test_crear_pedido_por_api_cuesta_una_consulta_extra_por_linea_como_maximo(
    cliente_comprador, puesto
):
    productos, categoria = _productos(puesto, 12)
    from apps.catalog.services import asignar_categoria

    asignar_categoria(puesto=puesto, categoria=categoria)

    def crear(n):
        return lambda: cliente_comprador.post(
            PEDIDOS,
            {
                "id_puesto": puesto.pk,
                "tipo_entrega": "retiro",
                "items": [{"id_producto": p.pk, "cantidad": 1} for p in productos[:n]],
            },
            format="json",
        )

    una = _consultas(crear(1))
    doce = _consultas(crear(12))
    # Antes: 3 consultas por línea (SELECT del serializer + UPDATE + INSERT).
    print(f"MEDICION crear_pedido: 1 linea={una} consultas, 12 lineas={doce}")
    assert doce - una <= 11, (una, doce)


def test_un_pedido_con_mas_de_50_lineas_se_rechaza_sin_consultar_cada_una(
    cliente_comprador, puesto
):
    items = [{"id_producto": 900000 + i, "cantidad": 1} for i in range(120)]
    with CaptureQueriesContext(connection) as contexto:
        respuesta = cliente_comprador.post(
            PEDIDOS,
            {"id_puesto": puesto.pk, "tipo_entrega": "retiro", "items": items},
            format="json",
        )
    assert respuesta.status_code == 400
    assert len(contexto) < 20


def test_cancelar_no_hace_una_consulta_por_producto(comprador, puesto):
    productos, categoria = _productos(puesto, 10)
    from apps.catalog.services import asignar_categoria

    asignar_categoria(puesto=puesto, categoria=categoria)
    pedido = services.crear_pedido(
        usuario=comprador, datos=datos_pedido(puesto, [(p, 1) for p in productos])
    )
    consultas = _consultas(lambda: services.cancelar_pedido(pedido=pedido, usuario=comprador))
    # Antes: 2 consultas por producto (SELECT + UPDATE) además de las fijas.
    assert consultas <= 45, consultas
