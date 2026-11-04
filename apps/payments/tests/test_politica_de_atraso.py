"""Política de atraso de la comisión del efectivo (ADR-020): avisar, pausar y reactivar."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.notifications.models import Notificacion
from apps.orders import services as pedidos
from apps.orders.models import Pedido
from apps.payments import comisiones, services
from apps.payments.models import Pago
from tests.factories import (
    PagoFactory,
    PedidoFactory,
    ProductoFactory,
    PuestoFactory,
    UsuarioFactory,
    VendedorFactory,
)

pytestmark = pytest.mark.django_db

AVISO, BLOQUEO = Decimal("1000"), Decimal("3000")


@pytest.fixture(autouse=True)
def limites_activos(settings):
    settings.COMISION_LIMITE_AVISO = AVISO
    settings.COMISION_LIMITE_BLOQUEO = BLOQUEO


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
    VendedorFactory(id_usuario=usuario)
    return usuario


@pytest.fixture
def puesto(vendedor):
    return PuestoFactory(id_vendedor=vendedor)


def _debe(puesto, comision, *, aprobado=True):
    """Un cobro en efectivo del puesto con esa comisión; por defecto ya aprobado."""
    pedido = PedidoFactory(id_puesto=puesto, subtotal=Decimal("10000"), total=Decimal("10000"))
    return PagoFactory(
        id_pedido=pedido,
        metodo_pago=Pago.MetodoPago.EFECTIVO,
        estado=Pago.Estado.APROBADO if aprobado else Pago.Estado.PENDIENTE,
        subtotal_pedido=Decimal("10000"),
        total_cobrado=Decimal("10000"),
        comision_plataforma=Decimal(comision),
    )


def _nuevo_pedido(puesto, comprador=None):
    producto = ProductoFactory(id_puesto=puesto, stock=5)
    return pedidos.crear_pedido(
        usuario=comprador or UsuarioFactory(rol=Usuario.Rol.COMPRADOR),
        datos={
            "id_puesto": puesto,
            "tipo_entrega": Pedido.TipoEntrega.RETIRO,
            "items": [{"id_producto": producto, "cantidad": 1}],
        },
    )


class TestEstados:
    @pytest.mark.parametrize(
        "pendiente,esperado",
        [
            ("0", "al_dia"),
            ("999.99", "al_dia"),
            ("1000", "aviso"),
            ("2999.99", "aviso"),
            ("3000", "bloqueado"),
            ("90000", "bloqueado"),
            ("-500", "al_dia"),  # saldo a favor
        ],
    )
    def test_los_limites_son_inclusivos(self, pendiente, esperado):
        assert comisiones.estado_de(Decimal(pendiente)) == esperado

    def test_con_los_limites_en_cero_la_politica_esta_apagada(self, settings):
        settings.COMISION_LIMITE_AVISO = 0
        settings.COMISION_LIMITE_BLOQUEO = 0

        assert comisiones.estado_de(Decimal("99999999")) == "al_dia"

    def test_cuanto_falta_pagar_para_reactivar_deja_un_peso_por_debajo_del_limite(self):
        assert comisiones.pagar_para_reactivar(Decimal("3500")) == Decimal("501.00")
        assert comisiones.pagar_para_reactivar(Decimal("2999")) == Decimal("0.00")

    def test_la_cuenta_trae_el_estado_y_los_limites(self, admin, puesto):
        _debe(puesto, "3200")

        cuenta = comisiones.resumen(admin)[0]

        assert cuenta["estado"] == "bloqueado"
        assert (cuenta["limite_aviso"], cuenta["limite_bloqueo"]) == (AVISO, BLOQUEO)
        assert cuenta["pagar_para_reactivar"] == Decimal("201.00")


class TestElFrenoDePedidosNuevos:
    def test_un_vendedor_al_dia_recibe_pedidos(self, puesto):
        _debe(puesto, "500")

        assert _nuevo_pedido(puesto).estado == Pedido.Estado.PENDIENTE

    def test_en_aviso_todavia_recibe_pedidos(self, puesto):
        _debe(puesto, "2000")

        assert _nuevo_pedido(puesto).pk

    def test_bloqueado_ya_no_recibe_pedidos_nuevos_y_no_se_descuenta_stock(self, puesto):
        _debe(puesto, "3000")
        producto = ProductoFactory(id_puesto=puesto, stock=5)

        with pytest.raises(ValidationError) as error:
            pedidos.crear_pedido(
                usuario=UsuarioFactory(rol=Usuario.Rol.COMPRADOR),
                datos={
                    "id_puesto": puesto,
                    "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                    "items": [{"id_producto": producto, "cantidad": 1}],
                },
            )

        assert "no está recibiendo pedidos nuevos" in str(error.value)
        producto.refresh_from_db()
        assert producto.stock == 5

    def test_el_comprador_no_se_entera_de_la_deuda(self, puesto):
        _debe(puesto, "3000")

        with pytest.raises(ValidationError) as error:
            _nuevo_pedido(puesto)

        texto = str(error.value)
        assert "comisi" not in texto and "3.000" not in texto and "deuda" not in texto

    def test_los_pedidos_que_ya_estaban_en_curso_siguen_su_camino(self, puesto, vendedor):
        pedido = _nuevo_pedido(puesto)  # entra antes de la pausa
        services.crear_pago(
            pedido=pedido,
            usuario=pedido.id_comprador,
            datos={"metodo_pago": Pago.MetodoPago.EFECTIVO},
        )
        _debe(puesto, "5000")

        pedidos.confirmar_pedido(pedido=pedido, usuario=vendedor)

        pedido.refresh_from_db()
        assert pedido.estado == Pedido.Estado.CONFIRMADO

    def test_la_pausa_es_por_vendedor_no_afecta_a_los_demas(self, puesto):
        _debe(puesto, "5000")
        otro = PuestoFactory(id_vendedor=UsuarioFactory(rol=Usuario.Rol.VENDEDOR))

        assert _nuevo_pedido(otro).pk

    def test_pagar_reactiva_los_pedidos_y_avisa_al_vendedor(self, puesto, vendedor, admin):
        _debe(puesto, "3500")
        with pytest.raises(ValidationError):
            _nuevo_pedido(puesto)

        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="501")

        assert _nuevo_pedido(puesto).pk
        aviso = Notificacion.objects.get(id_usuario=vendedor, titulo="Anotamos tu pago de comisión")
        assert "vuelven a recibir pedidos nuevos" in aviso.mensaje

    def test_un_pago_parcial_que_no_baja_del_limite_no_reactiva(self, puesto, vendedor, admin):
        _debe(puesto, "3500")

        comisiones.registrar_liquidacion(actor=admin, id_vendedor=vendedor.pk, monto="100")

        with pytest.raises(ValidationError):
            _nuevo_pedido(puesto)
        aviso = Notificacion.objects.get(id_usuario=vendedor, titulo="Anotamos tu pago de comisión")
        assert "vuelven a recibir" not in aviso.mensaje

    def test_apagada_no_cuesta_ni_una_consulta(self, settings, puesto):
        settings.COMISION_LIMITE_BLOQUEO = 0

        with CaptureQueriesContext(connection) as consultas:
            comisiones.vendedor_bloqueado(puesto.id_vendedor_id)

        assert len(consultas) == 0


class TestAvisosAlCruzarUnLimite:
    def _aprobar(self, pago):
        pago.estado = Pago.Estado.PENDIENTE
        pago.save(update_fields=["estado"])
        services._aplicar_estado(pago=pago, destino=Pago.Estado.APROBADO)

    def test_avisa_al_cruzar_el_limite_de_aviso(self, puesto, vendedor):
        _debe(puesto, "900")
        nuevo = _debe(puesto, "300", aprobado=False)

        self._aprobar(nuevo)

        aviso = Notificacion.objects.get(id_usuario=vendedor)
        assert aviso.titulo == "Tu comisión pendiente va creciendo"
        assert "$1.200" in aviso.mensaje and "$3.000" in aviso.mensaje

    def test_avisa_al_llegar_al_bloqueo_y_dice_cuanto_pagar(self, puesto, vendedor):
        _debe(puesto, "2900")
        nuevo = _debe(puesto, "600", aprobado=False)

        self._aprobar(nuevo)

        aviso = Notificacion.objects.get(id_usuario=vendedor)
        assert aviso.titulo == "Tus puestos están en pausa para pedidos nuevos"
        assert "pagues $501" in aviso.mensaje and "siguen igual" in aviso.mensaje

    def test_no_repite_el_aviso_mientras_siga_en_el_mismo_estado(self, puesto, vendedor):
        _debe(puesto, "1200")  # ya en aviso
        nuevo = _debe(puesto, "300", aprobado=False)

        self._aprobar(nuevo)

        assert not Notificacion.objects.filter(id_usuario=vendedor).exists()

    def test_un_cobro_por_debajo_de_los_limites_no_avisa(self, puesto, vendedor):
        self._aprobar(_debe(puesto, "100", aprobado=False))

        assert not Notificacion.objects.filter(id_usuario=vendedor).exists()

    def test_solo_el_efectivo_cuenta(self, puesto, vendedor):
        pedido = PedidoFactory(id_puesto=puesto)
        pago = PagoFactory(
            id_pedido=pedido,
            metodo_pago=Pago.MetodoPago.SIMULADO,
            estado=Pago.Estado.PENDIENTE,
            comision_plataforma=Decimal("9999"),
        )

        services._aplicar_estado(pago=pago, destino=Pago.Estado.APROBADO)

        assert not Notificacion.objects.filter(id_usuario=vendedor).exists()


class TestPorLaApi:
    def test_el_vendedor_ve_en_su_cuenta_que_esta_en_pausa(self, puesto, vendedor):
        _debe(puesto, "3400")
        cliente = APIClient()
        cliente.force_authenticate(vendedor)

        cuenta = cliente.get("/api/payments/comisiones/").data[0]

        assert cuenta["estado"] == "bloqueado"
        assert cuenta["pagar_para_reactivar"] == "401.00"
        assert cuenta["limite_bloqueo"] == "3000.00"
