"""Comisión que los vendedores le deben a la plataforma por el efectivo (ADR-019)."""

from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.audit.models import RegistroAuditoria
from apps.notifications.models import Notificacion
from apps.payments import comisiones
from apps.payments.models import LiquidacionComision, Pago
from tests.factories import (
    PagoFactory,
    PedidoFactory,
    PuestoFactory,
    UsuarioFactory,
    VendedorFactory,
)

COMISIONES = "/api/payments/comisiones/"
LIQUIDACIONES = "/api/payments/comisiones/liquidaciones/"

pytestmark = pytest.mark.django_db


def _vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
    VendedorFactory(id_usuario=usuario)
    return usuario


def _pago(vendedor, comision, *, metodo=Pago.MetodoPago.EFECTIVO, estado=Pago.Estado.APROBADO):
    """Un pago de un puesto del vendedor con la comisión indicada (subtotal 10.000)."""
    puesto = PuestoFactory(id_vendedor=vendedor)
    pedido = PedidoFactory(
        id_puesto=puesto, subtotal=Decimal("10000.00"), total=Decimal("10000.00")
    )
    return PagoFactory(
        id_pedido=pedido,
        metodo_pago=metodo,
        estado=estado,
        subtotal_pedido=Decimal("10000.00"),
        comision_plataforma=Decimal(comision),
        total_cobrado=Decimal("10000.00"),
    )


def _cliente(usuario):
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def vendedor():
    return _vendedor()


class TestCuantoDebeCadaVendedor:
    def test_suma_la_comision_de_los_pagos_en_efectivo_aprobados(self, admin, vendedor):
        _pago(vendedor, "800.00")
        _pago(vendedor, "400.00")

        cuenta = comisiones.resumen(admin)[0]

        assert cuenta["id_vendedor"] == vendedor.pk
        assert cuenta["pagos_en_efectivo"] == 2
        assert cuenta["cobrado_en_efectivo"] == Decimal("20000.00")
        assert cuenta["comision_generada"] == Decimal("1200.00")
        assert cuenta["comision_pagada"] == Decimal("0.00")
        assert cuenta["comision_pendiente"] == Decimal("1200.00")

    def test_solo_cuenta_el_efectivo_porque_lo_demas_no_pasa_por_el_puesto(self, admin, vendedor):
        _pago(vendedor, "800.00")
        _pago(vendedor, "999.00", metodo=Pago.MetodoPago.SIMULADO)
        _pago(vendedor, "999.00", metodo=Pago.MetodoPago.NEQUI)

        assert comisiones.resumen(admin)[0]["comision_generada"] == Decimal("800.00")

    @pytest.mark.parametrize(
        "estado",
        [
            Pago.Estado.PENDIENTE,
            Pago.Estado.PROCESANDO,
            Pago.Estado.REEMBOLSADO,
            Pago.Estado.ANULADO,
        ],
    )
    def test_un_cobro_que_no_esta_aprobado_no_genera_comision(self, estado, admin, vendedor):
        _pago(vendedor, "800.00", estado=estado)

        assert comisiones.resumen(admin) == []

    def test_cada_vendedor_tiene_su_cuenta_y_los_que_mas_deben_van_primero(self, admin):
        poco, mucho = _vendedor(), _vendedor()
        _pago(poco, "100.00")
        _pago(mucho, "900.00")

        cuentas = comisiones.resumen(admin)

        assert [c["id_vendedor"] for c in cuentas] == [mucho.pk, poco.pk]

    def test_lo_pagado_baja_lo_pendiente(self, admin, vendedor):
        _pago(vendedor, "1000.00")
        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="400.00")

        cuenta = comisiones.resumen(admin)[0]

        assert cuenta["comision_pagada"] == Decimal("400.00")
        assert cuenta["comision_pendiente"] == Decimal("600.00")
        assert cuenta["ultimo_pago"] is not None

    def test_un_cobro_reembolsado_despues_de_pagar_deja_saldo_a_favor(self, admin, vendedor):
        pago = _pago(vendedor, "1000.00")
        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="1000.00")

        pago.estado = Pago.Estado.REEMBOLSADO
        pago.save(update_fields=["estado"])

        assert comisiones.resumen(admin)[0]["comision_pendiente"] == Decimal("-1000.00")


class TestAnotarUnPago:
    def test_el_administrador_anota_un_pago_y_queda_registro(self, admin, vendedor):
        _pago(vendedor, "1000.00")

        liquidacion = comisiones.registrar_liquidacion(
            actor=admin, id_vendedor=vendedor.pk, monto="1000.00", nota="  Nequi del lunes "
        )

        assert liquidacion.monto == Decimal("1000.00")
        assert liquidacion.nota == "Nequi del lunes"
        assert liquidacion.registrada_por == admin
        assert RegistroAuditoria.objects.filter(
            id_usuario=admin, entidad="liquidacion_comision", id_entidad=liquidacion.pk
        ).exists()

    def test_el_vendedor_recibe_un_aviso_con_lo_que_le_queda(self, admin, vendedor):
        _pago(vendedor, "1000.00")

        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="300.00")

        aviso = Notificacion.objects.get(id_usuario=vendedor)
        assert aviso.mensaje == (
            "RioMarket anotó tu pago de comisión por $300. Te queda por pagar $700."
        )

    def test_los_pesos_se_escriben_con_punto_de_miles(self, admin, vendedor):
        _pago(vendedor, "1234567.00")

        with pytest.raises(ValidationError) as error:
            comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="9999999")

        assert "$1.234.567" in str(error.value)

    def test_al_pagar_todo_el_aviso_dice_que_quedo_al_dia(self, admin, vendedor):
        _pago(vendedor, "1000.00")

        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="1000.00")

        assert "al día" in Notificacion.objects.get(id_usuario=vendedor).mensaje

    def test_no_se_puede_anotar_mas_de_lo_que_se_debe(self, admin, vendedor):
        _pago(vendedor, "1000.00")

        with pytest.raises(ValidationError) as error:
            comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="1000.01")

        assert "no puedes anotar más" in str(error.value)
        assert not LiquidacionComision.objects.exists()

    def test_no_se_anota_a_quien_no_debe_nada(self, admin, vendedor):
        with pytest.raises(ValidationError, match="no tiene comisión pendiente"):
            comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="100.00")

    @pytest.mark.parametrize("monto", ["0", "-5", "abc", None])
    def test_el_monto_debe_ser_un_numero_positivo(self, monto, admin, vendedor):
        _pago(vendedor, "1000.00")

        with pytest.raises(ValidationError):
            comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto=monto)

    def test_solo_se_anota_a_vendedores_que_existen(self, admin):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        for id_vendedor in (999999, comprador.pk):
            with pytest.raises(ValidationError, match="no existe"):
                comisiones.registrar_liquidacion(actor=admin, id_vendedor=id_vendedor, monto="1")

    def test_dos_pagos_seguidos_no_pueden_pasarse_del_saldo(self, admin, vendedor):
        _pago(vendedor, "1000.00")
        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="600.00")

        with pytest.raises(ValidationError):
            comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="600.00")

        assert LiquidacionComision.objects.count() == 1

    def test_ni_el_vendedor_ni_el_comprador_anotan_pagos(self, vendedor):
        _pago(vendedor, "1000.00")
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)

        for actor in (vendedor, comprador):
            with pytest.raises(PermissionDenied):
                comisiones.registrar_liquidacion(actor=actor, id_vendedor=vendedor.pk, monto="1")


class TestPorLaApi:
    def test_el_administrador_ve_la_cuenta_de_todos(self, admin):
        uno, otro = _vendedor(), _vendedor()
        _pago(uno, "500.00")
        _pago(otro, "300.00")

        respuesta = _cliente(admin).get(COMISIONES)

        assert respuesta.status_code == status.HTTP_200_OK
        assert {fila["id_vendedor"] for fila in respuesta.data} == {uno.pk, otro.pk}

    def test_un_vendedor_solo_ve_la_suya(self, vendedor):
        otro = _vendedor()
        _pago(vendedor, "500.00")
        _pago(otro, "300.00")

        respuesta = _cliente(vendedor).get(COMISIONES)

        assert [fila["id_vendedor"] for fila in respuesta.data] == [vendedor.pk]
        assert respuesta.data[0]["comision_pendiente"] == "500.00"

    def test_un_vendedor_sin_ventas_en_efectivo_recibe_su_cuenta_en_ceros(self, vendedor):
        respuesta = _cliente(vendedor).get(COMISIONES)

        assert respuesta.data[0]["comision_pendiente"] == "0.00"

    def test_el_comprador_y_el_anonimo_no_ven_nada(self):
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)

        assert _cliente(comprador).get(COMISIONES).status_code == status.HTTP_403_FORBIDDEN
        assert APIClient().get(COMISIONES).status_code == status.HTTP_401_UNAUTHORIZED

    def test_el_administrador_anota_un_pago(self, admin, vendedor):
        _pago(vendedor, "1000.00")

        respuesta = _cliente(admin).post(
            LIQUIDACIONES, {"id_vendedor": vendedor.pk, "monto": "250.00", "nota": "Efectivo"}
        )

        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["monto"] == "250.00"
        assert respuesta.data["vendedor"] == vendedor.nombre

    def test_el_vendedor_no_puede_anotarse_un_pago_a_si_mismo(self, vendedor):
        _pago(vendedor, "1000.00")

        respuesta = _cliente(vendedor).post(
            LIQUIDACIONES, {"id_vendedor": vendedor.pk, "monto": "1000.00"}
        )

        assert respuesta.status_code == status.HTTP_403_FORBIDDEN
        assert not LiquidacionComision.objects.exists()

    def test_pasarse_del_saldo_es_un_400_con_el_motivo(self, admin, vendedor):
        _pago(vendedor, "100.00")

        respuesta = _cliente(admin).post(
            LIQUIDACIONES, {"id_vendedor": vendedor.pk, "monto": "999.00"}
        )

        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "no puedes anotar más" in str(respuesta.data)

    def test_el_historial_se_filtra_por_vendedor_y_cada_vendedor_ve_solo_el_suyo(self, admin):
        uno, otro = _vendedor(), _vendedor()
        for dueno in (uno, otro):
            _pago(dueno, "500.00")
            comisiones.registrar_liquidacion(actor=admin, id_vendedor=dueno.pk, monto="100.00")

        todos = _cliente(admin).get(LIQUIDACIONES).data["results"]
        filtrado = _cliente(admin).get(LIQUIDACIONES, {"vendedor": uno.pk}).data["results"]
        propio = _cliente(otro).get(LIQUIDACIONES).data["results"]

        assert len(todos) == 2
        assert [fila["id_vendedor"] for fila in filtrado] == [uno.pk]
        assert [fila["id_vendedor"] for fila in propio] == [otro.pk]


class TestCostoFijo:
    def test_las_consultas_no_crecen_con_la_cantidad_de_vendedores(self, admin):
        _pago(_vendedor(), "100.00")
        with CaptureQueriesContext(connection) as pocos:
            comisiones.resumen(admin)

        for _ in range(12):
            _pago(_vendedor(), "100.00")
        with CaptureQueriesContext(connection) as muchos:
            comisiones.resumen(admin)

        assert len(muchos) == len(pocos)
