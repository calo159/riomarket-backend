"""Lo que el administrador fija en el panel llega al dinero, y solo hacia adelante (ADR-022)."""

from decimal import Decimal

import pytest

from apps.accounts.models import Usuario
from apps.administration import services as administracion
from apps.orders import services as orders_services
from apps.orders.models import Pedido
from apps.payments import comisiones
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from tests.factories import UsuarioFactory

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("ajustes_del_panel")]

MOTIVO = "Acuerdo con los vendedores"


@pytest.fixture(autouse=True)
def _valores_del_servidor(settings):
    settings.PLATFORM_COMMISSION_PERCENTAGE = "8.00"
    settings.DOMICILIO_TARIFA_BASE = "3000.00"
    settings.COMISION_LIMITE_AVISO = "50000"
    settings.COMISION_LIMITE_BLOQUEO = "150000"


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


def _fijar(admin, **valores):
    administracion.actualizar_configuracion(actor=admin, valores=valores, motivo=MOTIVO)


def _pagar(comprador, puesto, producto, **extra):
    pedido = orders_services.crear_pedido(
        usuario=comprador,
        datos={
            "id_puesto": puesto,
            "tipo_entrega": Pedido.TipoEntrega.RETIRO,
            "items": [{"id_producto": producto, "cantidad": 2}],
            **extra,
        },
    )
    return pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.NEQUI}
    )


def test_el_pago_nuevo_usa_la_comision_del_panel(admin, comprador, puesto, producto):
    _fijar(admin, comision_porcentaje=Decimal("5"))

    pago = _pagar(comprador, puesto, producto)

    # 20.000 de mercancía al 5 % en lugar del 8 % del servidor.
    assert pago.comision_plataforma == Decimal("1000.00")
    assert pago.neto_vendedor == Decimal("19000.00")


def test_cambiar_la_comision_no_toca_los_pagos_ya_creados(admin, comprador, puesto, producto):
    antes = _pagar(comprador, puesto, producto)
    assert antes.comision_plataforma == Decimal("1600.00")

    _fijar(admin, comision_porcentaje=Decimal("2"))

    antes.refresh_from_db()
    assert antes.comision_plataforma == Decimal("1600.00")
    assert antes.neto_vendedor == Decimal("18400.00")
    despues = _pagar(comprador, puesto, producto)
    assert despues.comision_plataforma == Decimal("400.00")


def test_la_tarifa_de_domicilio_del_panel_se_cobra_en_pedidos_nuevos(
    admin, comprador, puesto, producto
):
    _fijar(admin, tarifa_domicilio=Decimal("4500"))

    pedido = orders_services.crear_pedido(
        usuario=comprador,
        datos={
            "id_puesto": puesto,
            "tipo_entrega": Pedido.TipoEntrega.DOMICILIO,
            "direccion_entrega": "Calle 1 #2-3",
            "items": [{"id_producto": producto, "cantidad": 1}],
        },
    )

    assert pedido.tarifa_domicilio == Decimal("4500.00")
    assert pedido.total == Decimal("14500.00")


def test_los_limites_del_panel_deciden_quien_queda_en_pausa(admin):
    assert comisiones.estado_de(Decimal("60000")) == comisiones.AVISO

    _fijar(admin, limite_aviso=Decimal("20000"), limite_bloqueo=Decimal("55000"))

    assert comisiones.limites() == (Decimal("20000.00"), Decimal("55000.00"))
    assert comisiones.estado_de(Decimal("60000")) == comisiones.BLOQUEADO
    assert comisiones.estado_de(Decimal("25000")) == comisiones.AVISO
    assert comisiones.estado_de(Decimal("10000")) == comisiones.AL_DIA


def test_poner_cero_apaga_la_pausa(admin):
    _fijar(admin, limite_bloqueo=Decimal("0"))

    assert comisiones.estado_de(Decimal("9999999")) == comisiones.AVISO


def test_volver_al_valor_del_servidor_restaura_los_limites(admin):
    _fijar(admin, limite_aviso=Decimal("20000"))
    _fijar(admin, limite_aviso=None)

    assert comisiones.limites() == (Decimal("50000"), Decimal("150000"))
