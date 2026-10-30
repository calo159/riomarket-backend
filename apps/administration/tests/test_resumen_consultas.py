"""``resumen()`` calcula todo con pocas consultas y los mismos valores (R-16)."""

from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.administration.services import resumen
from apps.orders.models import Pedido
from apps.payments.models import Pago
from tests.factories import (
    CuponFactory,
    PagoFactory,
    PedidoFactory,
    ResenaFactory,
    UsuarioFactory,
)

pytestmark = pytest.mark.django_db

# Usuario, Pedido, Pago, Vendedor, Puesto, Producto, Reseña y Cupón: una consulta por tabla.
CONSULTAS_ESPERADAS = 8


def test_resumen_valores_y_consultas(comprador, vendedor, puesto, admin):
    suspendido = UsuarioFactory(rol="comprador")
    suspendido.estado = suspendido.Estado.SUSPENDIDO
    suspendido.save(update_fields=["estado"])

    entregado = PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado="entregado")
    PedidoFactory(
        id_comprador=comprador,
        id_puesto=puesto,
        estado=Pedido.Estado.EN_CAMINO,
        no_recibido_en=timezone.now(),
    )
    PagoFactory(
        id_pedido=entregado,
        estado=Pago.Estado.APROBADO,
        subtotal_pedido=Decimal("10000.00"),
        comision_plataforma=Decimal("500.00"),
        total_cobrado=Decimal("10000.00"),
    )
    ResenaFactory(id_usuario=comprador, id_puesto=puesto, visible=False)
    CuponFactory(activo=True)
    CuponFactory(activo=False)

    with CaptureQueriesContext(connection) as contexto:
        datos = resumen()

    assert datos["usuarios"]["total"] == 4
    assert datos["usuarios"]["activos"] == 3
    assert datos["usuarios"]["suspendidos"] == 1
    assert datos["usuarios"]["por_rol"] == {"comprador": 2, "vendedor": 1, "administrador": 1}
    assert datos["pedidos"]["total"] == 2
    assert datos["pedidos"]["activos"] == 1
    assert datos["pedidos"]["con_no_recibido"] == 1
    assert datos["pedidos"]["por_estado"]["entregado"] == 1
    assert datos["pagos"]["total"] == 1
    assert datos["pagos"]["por_confirmar"] == 0
    assert datos["pagos"]["total_vendido"] == "10000.00"
    assert datos["pagos"]["comision"] == "500.00"
    assert datos["verificaciones_pendientes"] == 0
    assert datos["resenas"] == {"total": 1, "ocultas": 1}
    assert datos["cupones"] == {"total": 2, "activos": 1}
    assert len(contexto) == CONSULTAS_ESPERADAS, [q["sql"][:80] for q in contexto.captured_queries]


def test_resumen_sin_datos_devuelve_ceros():
    datos = resumen()
    assert datos["usuarios"]["total"] == 0
    assert datos["pagos"]["total_vendido"] == "0.00"
    assert datos["pagos"]["comision"] == "0.00"
    assert datos["pedidos"]["por_estado"]["entregado"] == 0
