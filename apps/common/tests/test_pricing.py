"""Reglas de dinero (ADR-003 y ADR-018): comisión sobre lo cobrado y domicilio para el puesto."""

from decimal import Decimal

import pytest

from apps.common import pricing

D = Decimal


@pytest.fixture(autouse=True)
def comision_del_10(settings):
    settings.PLATFORM_COMMISSION_PERCENTAGE = D("10.00")
    settings.DOMICILIO_TARIFA_PARA_VENDEDOR = True


class TestBaseDeComision:
    def test_sin_cupon_es_el_subtotal(self):
        assert pricing.comision_plataforma(D("10000")) == D("1000.00")

    def test_el_cupon_lo_asume_el_vendedor_y_la_comision_baja_con_el(self):
        # Antes: 10 % de 10.000 = 1.000 aunque el cliente pagara 5.000 (comisión real: 20 %).
        assert pricing.comision_plataforma(D("10000"), D("5000")) == D("500.00")

    def test_un_cupon_del_100_por_ciento_no_genera_comision(self):
        assert pricing.comision_plataforma(D("10000"), D("10000")) == D("0.00")

    def test_un_descuento_mayor_que_el_subtotal_no_da_comision_negativa(self):
        assert pricing.base_de_comision(D("1000"), D("5000")) == D("0.00")
        assert pricing.comision_plataforma(D("1000"), D("5000")) == D("0.00")


class TestNetoDelVendedor:
    def test_mercancia_menos_comision_mas_domicilio(self):
        comision = pricing.comision_plataforma(D("10000"))
        neto = pricing.neto_vendedor(D("10000"), comision, tarifa_domicilio=D("3000"))
        assert neto == D("12000.00")  # 10.000 - 1.000 + 3.000

    def test_con_cupon_el_neto_es_lo_cobrado_menos_su_comision(self):
        comision = pricing.comision_plataforma(D("10000"), D("4000"))
        neto = pricing.neto_vendedor(D("10000"), comision, descuento=D("4000"))
        assert (comision, neto) == (D("600.00"), D("5400.00"))  # el vendedor nunca queda en rojo

    def test_un_pedido_gratis_deja_al_vendedor_en_cero_no_en_deuda(self):
        comision = pricing.comision_plataforma(D("10000"), D("10000"))
        assert pricing.neto_vendedor(D("10000"), comision, descuento=D("10000")) == D("0.00")

    def test_si_la_plataforma_se_queda_el_domicilio_no_se_suma(self, settings):
        settings.DOMICILIO_TARIFA_PARA_VENDEDOR = False
        neto = pricing.neto_vendedor(D("10000"), D("1000"), tarifa_domicilio=D("3000"))
        assert neto == D("9000.00")

    def test_el_domicilio_no_paga_comision(self):
        # La comisión es solo sobre la mercancía: pedir domicilio no la encarece.
        assert pricing.comision_plataforma(D("10000")) == D("1000.00")
