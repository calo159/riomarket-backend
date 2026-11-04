"""Pago contra entrega a domicilio (ADR-021).

El cliente paga en efectivo cuando recibe: el pedido se confirma sin cobro previo, el
vendedor entrega y cobra, y si el cliente no recibe y nada se cobró, el vendedor cancela.
Un domicilio ya pagado se comporta como siempre.
"""

from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status

from apps.orders import services
from apps.orders.models import Pedido
from apps.payments import comisiones
from apps.payments import services as pagos_services
from apps.payments.models import Pago

from .conftest import PEDIDOS
from .test_services import datos_pedido

pytestmark = pytest.mark.django_db

E = Pedido.Estado
DOMICILIO = Pedido.TipoEntrega.DOMICILIO


def _pedido_domicilio(comprador, puesto_domicilio, producto_domicilio, cantidad=2):
    return services.crear_pedido(
        usuario=comprador,
        datos=datos_pedido(
            puesto_domicilio,
            [(producto_domicilio, cantidad)],
            tipo_entrega=DOMICILIO,
            direccion_entrega="Calle 15 #7-42",
        ),
    )


def _en_camino(pedido, vendedor):
    services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
    services.marcar_enviado(pedido=pedido, usuario=vendedor)
    return pedido


@pytest.fixture
def montos_reales(settings):
    """Comisión y tarifa de domicilio con valores, para que los montos del pago no sean cero."""
    settings.PLATFORM_COMMISSION_PERCENTAGE = "8"
    settings.DOMICILIO_TARIFA_BASE = "3000.00"


@pytest.fixture
def contra_entrega(comprador, vendedor, puesto_domicilio, producto_domicilio):
    """Domicilio con el efectivo por cobrar, ya en camino."""
    pedido = _pedido_domicilio(comprador, puesto_domicilio, producto_domicilio)
    pago = pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    _en_camino(pedido, vendedor)
    return pedido, pago


@pytest.fixture
def domicilio_pagado(comprador, vendedor, puesto_domicilio, producto_domicilio, aprobar_pago):
    """Domicilio pagado por adelantado (sandbox), ya en camino."""
    pedido = _pedido_domicilio(comprador, puesto_domicilio, producto_domicilio)
    pago = aprobar_pago(pedido, comprador)
    _en_camino(pedido, vendedor)
    return pedido, pago


class TestEntregarYCobrar:
    def test_el_vendedor_entrega_y_el_cobro_queda_aprobado(self, contra_entrega, vendedor):
        pedido, pago = contra_entrega
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pedido.estado == E.ENTREGADO
        assert pago.estado == Pago.Estado.APROBADO
        assert pago.fecha_aprobacion is not None

    def test_el_administrador_tambien_entrega_y_cobra(self, contra_entrega, admin):
        pedido, pago = contra_entrega
        services.marcar_entregado(pedido=pedido, usuario=admin)
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.APROBADO

    def test_el_comprador_no_cierra_su_propio_efectivo(self, contra_entrega, cliente_comprador):
        pedido, pago = contra_entrega
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "vendedor debe confirmar el cobro" in str(respuesta.data)
        pedido.refresh_from_db()
        pago.refresh_from_db()
        assert pedido.estado == E.EN_CAMINO
        assert pago.estado == Pago.Estado.PENDIENTE

    def test_otro_vendedor_no_puede_entregar(self, contra_entrega):
        from apps.accounts.models import Usuario
        from tests.factories import UsuarioFactory, VendedorFactory

        pedido, _ = contra_entrega
        ajeno = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        VendedorFactory(id_usuario=ajeno)
        with pytest.raises(PermissionDenied):
            services.marcar_entregado(pedido=pedido, usuario=ajeno)

    def test_el_cobro_suma_a_la_comision_que_el_vendedor_le_debe_a_riomarket(
        self, montos_reales, contra_entrega, vendedor
    ):
        pedido, pago = contra_entrega
        assert comisiones.pendiente_de(vendedor.pk) == Decimal("0")
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pago.comision_plataforma > 0
        assert comisiones.pendiente_de(vendedor.pk) == pago.comision_plataforma

    def test_el_envio_es_del_puesto_y_no_paga_comision(
        self, montos_reales, contra_entrega, vendedor
    ):
        pedido, pago = contra_entrega
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pago.tarifa_domicilio_aplicada > 0
        assert pago.neto_vendedor == (
            pago.subtotal_pedido - pago.comision_plataforma + pago.tarifa_domicilio_aplicada
        )


class TestAccionesPermitidas:
    def test_el_vendedor_ve_entregar_y_cancelar_el_comprador_no_ve_entregar(
        self, contra_entrega, vendedor, comprador
    ):
        pedido, _ = contra_entrega
        pedido = Pedido.objects.select_related("pago", "id_puesto").get(pk=pedido.pk)

        del_vendedor = services.acciones_disponibles(pedido, vendedor)
        assert "entregar" in del_vendedor
        assert "cancelar" in del_vendedor
        assert "confirmar-pago" in del_vendedor

        del_comprador = services.acciones_disponibles(pedido, comprador)
        assert "entregar" not in del_comprador
        assert "cancelar" not in del_comprador  # el comprador solo cancela mientras está pendiente
        assert "no-recibido" in del_comprador

    def test_un_domicilio_ya_pagado_lo_cierra_el_comprador_no_el_vendedor(
        self, domicilio_pagado, vendedor, comprador
    ):
        pedido, _ = domicilio_pagado
        pedido = Pedido.objects.select_related("pago", "id_puesto").get(pk=pedido.pk)

        assert "entregar" not in services.acciones_disponibles(pedido, vendedor)
        assert "cancelar" not in services.acciones_disponibles(pedido, vendedor)
        assert "entregar" in services.acciones_disponibles(pedido, comprador)

    def test_el_vendedor_no_entrega_un_domicilio_ya_pagado_por_la_api(
        self, domicilio_pagado, cliente_vendedor
    ):
        pedido, _ = domicilio_pagado
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN
        pedido.refresh_from_db()
        assert pedido.estado == E.EN_CAMINO


class TestClienteQueNoRecibe:
    def test_el_vendedor_cancela_en_camino_y_nada_queda_cobrado(
        self, contra_entrega, vendedor, producto_domicilio
    ):
        pedido, pago = contra_entrega
        producto_domicilio.refresh_from_db()
        stock_antes = producto_domicilio.stock

        services.cancelar_pedido(pedido=pedido, usuario=vendedor)

        pedido.refresh_from_db()
        pago.refresh_from_db()
        producto_domicilio.refresh_from_db()
        assert pedido.estado == E.CANCELADO
        assert pago.estado == Pago.Estado.ANULADO
        assert producto_domicilio.stock == stock_antes + 2  # la mercancía vuelve al inventario
        assert comisiones.pendiente_de(vendedor.pk) == Decimal("0")  # sin cobro no hay comisión

    def test_el_administrador_tambien_puede(self, contra_entrega, admin):
        pedido, _ = contra_entrega
        services.cancelar_pedido(pedido=pedido, usuario=admin)
        pedido.refresh_from_db()
        assert pedido.estado == E.CANCELADO

    def test_el_comprador_no_cancela_en_camino(self, contra_entrega, comprador):
        pedido, _ = contra_entrega
        with pytest.raises(PermissionDenied):
            services.cancelar_pedido(pedido=pedido, usuario=comprador)

    def test_un_domicilio_pagado_no_se_cancela_en_camino(self, domicilio_pagado, vendedor, admin):
        pedido, pago = domicilio_pagado
        for quien in (vendedor, admin):
            with pytest.raises(DjangoValidationError) as error:
                services.cancelar_pedido(pedido=pedido, usuario=quien)
            assert "ya va en camino" in str(error.value)
        pedido.refresh_from_db()
        pago.refresh_from_db()
        assert pedido.estado == E.EN_CAMINO
        assert pago.estado == Pago.Estado.APROBADO  # el dinero del cliente no se toca

    def test_reportar_no_recibido_sigue_funcionando(self, contra_entrega, comprador):
        pedido, _ = contra_entrega
        services.reportar_no_recibido(pedido=pedido, usuario=comprador, motivo="Nadie llegó")
        pedido.refresh_from_db()
        assert pedido.no_recibido_en is not None
        assert pedido.estado == E.EN_CAMINO


class TestConfirmarSinCobroPrevio:
    def test_un_domicilio_en_efectivo_se_confirma_antes_de_cobrar(
        self, comprador, vendedor, puesto_domicilio, producto_domicilio
    ):
        pedido = _pedido_domicilio(comprador, puesto_domicilio, producto_domicilio)
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
        )
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pedido.estado == E.CONFIRMADO
        assert pago.estado == Pago.Estado.PENDIENTE

    def test_sin_pago_registrado_no_se_confirma(
        self, comprador, vendedor, puesto_domicilio, producto_domicilio
    ):
        pedido = _pedido_domicilio(comprador, puesto_domicilio, producto_domicilio)
        with pytest.raises(DjangoValidationError):
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)
