"""Hallazgo S-10/L-04: un vendedor cuya verificación no está aprobada no opera pedidos."""

import pytest
from django.core.exceptions import PermissionDenied

from apps.accounts.models import Vendedor
from apps.orders import services
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago

from .test_services import datos_pedido

pytestmark = pytest.mark.django_db


@pytest.fixture
def pedido(comprador, puesto, producto):
    return services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))


@pytest.mark.parametrize(
    "estado",
    [Vendedor.EstadoVerificacion.RECHAZADO, Vendedor.EstadoVerificacion.PENDIENTE],
)
def test_vendedor_no_aprobado_no_confirma_cobros_ni_pedidos(estado, comprador, vendedor, pedido):
    pago = pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    Vendedor.objects.filter(id_usuario=vendedor).update(estado_verificacion=estado)
    vendedor.refresh_from_db()

    with pytest.raises(PermissionDenied):
        pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor, datos={})
    with pytest.raises(PermissionDenied):
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)


def test_vendedor_aprobado_sigue_operando(comprador, vendedor, pedido):
    pago = pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor, datos={})
    pedido = services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    assert pedido.estado == Pedido.Estado.CONFIRMADO


def test_vendedor_rechazado_si_puede_cancelar(comprador, vendedor, pedido):
    Vendedor.objects.filter(id_usuario=vendedor).update(
        estado_verificacion=Vendedor.EstadoVerificacion.RECHAZADO
    )
    vendedor.refresh_from_db()
    services.cancelar_pedido(pedido=pedido, usuario=vendedor)
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.CANCELADO
