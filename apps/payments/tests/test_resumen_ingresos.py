"""Agregado de ingresos aprobados en el servidor (F-08): respeta la visibilidad por rol."""

from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status

from apps.payments.models import Pago
from tests.factories import PagoFactory, PedidoFactory

from .conftest import PAGOS

RESUMEN = f"{PAGOS}resumen/"

pytestmark = pytest.mark.django_db


def _pago(
    puesto, estado=Pago.Estado.APROBADO, subtotal="10000.00", comision="500.00", descuento="0.00"
):
    total = Decimal(subtotal) - Decimal(descuento)
    return PagoFactory(
        id_pedido=PedidoFactory(id_puesto=puesto),
        estado=estado,
        subtotal_pedido=Decimal(subtotal),
        comision_plataforma=Decimal(comision),
        descuento_aplicado=Decimal(descuento),
        total_cobrado=total,
    )


def test_suma_el_neto_de_los_pagos_aprobados_del_vendedor(cliente_vendedor, puesto):
    _pago(puesto)  # neto 9500
    _pago(puesto, descuento="1000.00")  # neto 8500
    _pago(puesto, estado=Pago.Estado.PENDIENTE)  # no cuenta
    _pago(puesto, estado=Pago.Estado.REEMBOLSADO)  # no cuenta
    respuesta = cliente_vendedor.get(RESUMEN)
    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.data == {"pagos_aprobados": 2, "ingresos_aprobados": "18000.00"}


def test_el_neto_nunca_es_negativo(cliente_vendedor, puesto):
    _pago(puesto, subtotal="1000.00", comision="50.00", descuento="1000.00")
    respuesta = cliente_vendedor.get(RESUMEN)
    assert respuesta.data == {"pagos_aprobados": 1, "ingresos_aprobados": "0.00"}


def test_mas_de_cien_pagos_no_se_truncan(cliente_vendedor, puesto):
    for _ in range(105):
        _pago(puesto, subtotal="1000.00", comision="0.00")
    respuesta = cliente_vendedor.get(RESUMEN)
    assert respuesta.data["pagos_aprobados"] == 105
    assert respuesta.data["ingresos_aprobados"] == "105000.00"


def test_no_incluye_pagos_de_otros_vendedores(cliente_vendedor, puesto):
    _pago(puesto)
    _pago(PedidoFactory().id_puesto)
    assert cliente_vendedor.get(RESUMEN).data["pagos_aprobados"] == 1


def test_vendedor_sin_pagos_devuelve_ceros(cliente_vendedor):
    respuesta = cliente_vendedor.get(RESUMEN)
    assert respuesta.data == {"pagos_aprobados": 0, "ingresos_aprobados": "0.00"}


def test_el_administrador_ve_el_total_de_la_plataforma(cliente_admin, puesto):
    _pago(puesto)
    _pago(PedidoFactory().id_puesto)
    assert cliente_admin.get(RESUMEN).data["pagos_aprobados"] == 2


def test_comprador_y_anonimo_no_acceden(cliente_comprador, cliente_anon):
    assert cliente_comprador.get(RESUMEN).status_code == status.HTTP_403_FORBIDDEN
    assert cliente_anon.get(RESUMEN).status_code == status.HTTP_401_UNAUTHORIZED


def test_una_sola_consulta_de_agregado(cliente_vendedor, puesto):
    for _ in range(5):
        _pago(puesto)
    with CaptureQueriesContext(connection) as contexto:
        cliente_vendedor.get(RESUMEN)
    agregados = [q for q in contexto.captured_queries if "SUM(" in q["sql"]]
    assert len(agregados) == 1
