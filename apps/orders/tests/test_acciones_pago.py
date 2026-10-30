"""``acciones_permitidas`` incluye pagar y confirmar-pago según el pedido (F-01)."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.orders import services
from apps.payments import services as pagos_services
from apps.payments.models import Pago

from .test_services import datos_pedido

pytestmark = pytest.mark.django_db


@pytest.fixture
def pedido(comprador, puesto, producto):
    return services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))


def test_sin_pago_solo_el_comprador_puede_pagar(pedido, comprador, vendedor, admin):
    assert "pagar" in services.acciones_disponibles(pedido, comprador)
    assert "pagar" in services.acciones_disponibles(pedido, admin)
    assert "pagar" not in services.acciones_disponibles(pedido, vendedor)
    assert "confirmar-pago" not in services.acciones_disponibles(pedido, vendedor)


def test_con_pago_en_efectivo_confirma_solo_el_vendedor_de_ese_pedido(
    pedido, comprador, vendedor, otro_vendedor, admin
):
    pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    pedido.refresh_from_db()
    assert "confirmar-pago" in services.acciones_disponibles(pedido, vendedor)
    assert "confirmar-pago" in services.acciones_disponibles(pedido, admin)
    assert "confirmar-pago" not in services.acciones_disponibles(pedido, otro_vendedor)
    assert "confirmar-pago" not in services.acciones_disponibles(pedido, comprador)
    assert "pagar" not in services.acciones_disponibles(pedido, comprador)


def test_un_pago_con_otro_metodo_no_se_confirma_a_mano(pedido, comprador, vendedor):
    pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.NEQUI}
    )
    pedido.refresh_from_db()
    assert "confirmar-pago" not in services.acciones_disponibles(pedido, vendedor)


def test_tras_un_rechazo_el_comprador_vuelve_a_poder_pagar(pedido, comprador):
    pago = pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
    )
    pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "rechazar"})
    pedido.refresh_from_db()
    assert "pagar" in services.acciones_disponibles(pedido, comprador)


def test_vendedor_sin_verificacion_no_confirma_pagos(pedido, comprador, vendedor):
    from apps.accounts.models import Vendedor

    pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    Vendedor.objects.filter(id_usuario=vendedor).update(estado_verificacion="rechazado")
    vendedor.refresh_from_db()
    pedido.refresh_from_db()
    assert "confirmar-pago" not in services.acciones_disponibles(pedido, vendedor)


def test_el_listado_no_hace_consultas_extra_por_pedido(
    cliente_comprador, comprador, puesto, producto
):
    def crear():
        p = services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))
        pagos_services.crear_pago(
            pedido=p, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
        )

    crear()
    with CaptureQueriesContext(connection) as pocas:
        assert cliente_comprador.get("/api/orders/pedidos/").status_code == 200
    for _ in range(6):
        crear()
    with CaptureQueriesContext(connection) as muchas:
        assert cliente_comprador.get("/api/orders/pedidos/").status_code == 200
    assert len(muchas) == len(pocas)
