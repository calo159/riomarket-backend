"""Pedidos con retiro en el puesto: «listo para recoger» y pagar al recoger (ADR-009)."""

from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status

from apps.notifications.models import Notificacion
from apps.orders import services
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from tests.factories import PedidoFactory, PuestoFactory, VendedorPendienteFactory

from .conftest import PEDIDOS
from .test_services import datos_pedido

pytestmark = pytest.mark.django_db

E = Pedido.Estado
RETIRO = Pedido.TipoEntrega.RETIRO
DOMICILIO = Pedido.TipoEntrega.DOMICILIO

# Tabla esperada, escrita a mano (no importada del código): destinos válidos por estado.
ESPERADO = {
    RETIRO: {
        E.PENDIENTE: {E.CONFIRMADO, E.CANCELADO},
        E.CONFIRMADO: {E.EN_PREPARACION, E.CANCELADO},
        E.EN_PREPARACION: {E.LISTO_PARA_RECOGER, E.CANCELADO},
        E.EN_CAMINO: set(),
        E.LISTO_PARA_RECOGER: {E.ENTREGADO, E.CANCELADO},
        E.ENTREGADO: set(),
        E.CANCELADO: set(),
    },
    DOMICILIO: {
        E.PENDIENTE: {E.CONFIRMADO, E.CANCELADO},
        E.CONFIRMADO: {E.EN_PREPARACION, E.CANCELADO},
        E.EN_PREPARACION: {E.EN_CAMINO, E.CANCELADO},
        E.EN_CAMINO: {E.ENTREGADO},
        E.LISTO_PARA_RECOGER: set(),
        E.ENTREGADO: set(),
        E.CANCELADO: set(),
    },
}


# ---------------------------------------------------------------------------
# Máquina de estados por tipo de entrega
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("tipo", [RETIRO, DOMICILIO])
@pytest.mark.parametrize("origen", list(E))
@pytest.mark.parametrize("destino", list(E))
def test_tabla_de_transiciones(tipo, origen, destino, comprador, puesto):
    pedido = PedidoFactory(
        id_comprador=comprador, id_puesto=puesto, tipo_entrega=tipo, estado=origen
    )
    if destino in ESPERADO[tipo][origen]:
        services._validar_transicion(pedido, destino)
    else:
        with pytest.raises(DjangoValidationError) as error:
            services._validar_transicion(pedido, destino)
        assert "estado" in error.value.message_dict


@pytest.mark.parametrize("tipo", [RETIRO, DOMICILIO])
def test_transiciones_de_coincide_con_la_tabla(tipo, comprador, puesto):
    pedido = PedidoFactory(id_comprador=comprador, id_puesto=puesto, tipo_entrega=tipo)
    tabla = services.transiciones_de(pedido)
    assert {e: set(d) for e, d in tabla.items()} == ESPERADO[tipo]


def test_en_camino_imposible_en_retiro_por_la_api(cliente_vendedor, comprador, puesto):
    pedido = PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=E.EN_PREPARACION)
    respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/enviar/")
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    pedido.refresh_from_db()
    assert pedido.estado == E.EN_PREPARACION


def test_listo_para_recoger_imposible_en_domicilio_por_la_api(
    cliente_vendedor, comprador, puesto_domicilio
):
    pedido = PedidoFactory(
        id_comprador=comprador,
        id_puesto=puesto_domicilio,
        tipo_entrega=DOMICILIO,
        estado=E.EN_PREPARACION,
    )
    respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/listo-para-recoger/")
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    pedido.refresh_from_db()
    assert pedido.estado == E.EN_PREPARACION


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------
def _retiro(comprador, puesto, estado):
    return PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=estado)


def _domicilio(comprador, puesto, estado):
    return PedidoFactory(
        id_comprador=comprador, id_puesto=puesto, tipo_entrega=DOMICILIO, estado=estado
    )


class TestRbacRetiro:
    def test_vendedor_marca_listo(self, comprador, vendedor, puesto):
        pedido = _retiro(comprador, puesto, E.EN_PREPARACION)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        assert pedido.estado == E.LISTO_PARA_RECOGER

    def test_admin_marca_listo(self, comprador, admin, puesto):
        pedido = _retiro(comprador, puesto, E.EN_PREPARACION)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=admin)
        assert pedido.estado == E.LISTO_PARA_RECOGER

    def test_vendedor_ajeno_no_marca_listo(self, comprador, otro_vendedor, puesto):
        pedido = _retiro(comprador, puesto, E.EN_PREPARACION)
        with pytest.raises(PermissionDenied):
            services.marcar_listo_para_recoger(pedido=pedido, usuario=otro_vendedor)

    def test_vendedor_sin_verificacion_no_marca_listo(self, comprador):
        sin_verificar = VendedorPendienteFactory().id_usuario
        puesto = PuestoFactory(id_vendedor=sin_verificar)
        pedido = _retiro(comprador, puesto, E.EN_PREPARACION)
        with pytest.raises(PermissionDenied):
            services.marcar_listo_para_recoger(pedido=pedido, usuario=sin_verificar)

    def test_comprador_no_marca_listo(self, cliente_comprador, comprador, puesto):
        pedido = _retiro(comprador, puesto, E.EN_PREPARACION)
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/listo-para-recoger/")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_vendedor_entrega_un_retiro(self, comprador, vendedor, puesto):
        pedido = _retiro(comprador, puesto, E.LISTO_PARA_RECOGER)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        assert pedido.estado == E.ENTREGADO

    def test_vendedor_ajeno_no_entrega_un_retiro(self, comprador, otro_vendedor, puesto):
        pedido = _retiro(comprador, puesto, E.LISTO_PARA_RECOGER)
        with pytest.raises(PermissionDenied):
            services.marcar_entregado(pedido=pedido, usuario=otro_vendedor)

    def test_vendedor_sin_verificacion_no_entrega(self, comprador):
        sin_verificar = VendedorPendienteFactory().id_usuario
        puesto = PuestoFactory(id_vendedor=sin_verificar)
        pedido = _retiro(comprador, puesto, E.LISTO_PARA_RECOGER)
        with pytest.raises(PermissionDenied):
            services.marcar_entregado(pedido=pedido, usuario=sin_verificar)

    def test_comprador_y_admin_entregan_un_retiro_pagado(self, comprador, admin, puesto):
        for actor in (comprador, admin):
            pedido = _retiro(comprador, puesto, E.LISTO_PARA_RECOGER)
            services.marcar_entregado(pedido=pedido, usuario=actor)
            assert pedido.estado == E.ENTREGADO

    def test_vendedor_no_entrega_un_domicilio(
        self, cliente_vendedor, vendedor, comprador, puesto_domicilio
    ):
        pedido = _domicilio(comprador, puesto_domicilio, E.EN_CAMINO)
        with pytest.raises(PermissionDenied):
            services.marcar_entregado(pedido=pedido, usuario=vendedor)
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN
        pedido.refresh_from_db()
        assert pedido.estado == E.EN_CAMINO

    def test_comprador_entrega_su_domicilio(self, comprador, puesto_domicilio):
        pedido = _domicilio(comprador, puesto_domicilio, E.EN_CAMINO)
        services.marcar_entregado(pedido=pedido, usuario=comprador)
        assert pedido.estado == E.ENTREGADO


# ---------------------------------------------------------------------------
# Pagar al recoger
# ---------------------------------------------------------------------------
def _crear_retiro(comprador, puesto, producto, cantidad=2):
    return services.crear_pedido(
        usuario=comprador, datos=datos_pedido(puesto, [(producto, cantidad)])
    )


def _pago(pedido, comprador, metodo):
    return pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": metodo}
    )


class TestConfirmarSinPagoAprobado:
    def test_retiro_efectivo_pendiente_se_confirma(self, comprador, vendedor, puesto, producto):
        pedido = _crear_retiro(comprador, puesto, producto)
        pago = _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
        assert pago.estado == Pago.Estado.PENDIENTE
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pedido.estado == E.CONFIRMADO
        assert pago.estado == Pago.Estado.PENDIENTE  # se cobra al recoger

    def test_retiro_efectivo_procesando_se_confirma(self, comprador, vendedor, puesto, producto):
        pedido = _crear_retiro(comprador, puesto, producto)
        pago = _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
        pagos_services._aplicar_estado(pago=pago, destino=Pago.Estado.PROCESANDO)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert pedido.estado == E.CONFIRMADO

    @pytest.mark.parametrize(
        "metodo", [Pago.MetodoPago.NEQUI, Pago.MetodoPago.TARJETA, Pago.MetodoPago.DAVIPLATA]
    )
    def test_retiro_otro_metodo_pendiente_no_se_confirma(
        self, metodo, comprador, vendedor, puesto, producto
    ):
        pedido = _crear_retiro(comprador, puesto, producto)
        _pago(pedido, comprador, metodo)
        with pytest.raises(DjangoValidationError) as error:
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert "pago" in error.value.message_dict
        pedido.refresh_from_db()
        assert pedido.estado == E.PENDIENTE

    def test_retiro_sin_pago_no_se_confirma(self, comprador, vendedor, puesto, producto):
        pedido = _crear_retiro(comprador, puesto, producto)
        with pytest.raises(DjangoValidationError):
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)

    def test_domicilio_efectivo_pendiente_no_se_confirma(
        self, comprador, vendedor, puesto_domicilio, producto_domicilio
    ):
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(
                puesto_domicilio,
                [(producto_domicilio, 1)],
                tipo_entrega=DOMICILIO,
                direccion_entrega="Calle 15 #7-42",
            ),
        )
        _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
        with pytest.raises(DjangoValidationError) as error:
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert "pago" in error.value.message_dict
        pedido.refresh_from_db()
        assert pedido.estado == E.PENDIENTE


def _retiro_efectivo_listo(comprador, vendedor, puesto, producto):
    pedido = _crear_retiro(comprador, puesto, producto)
    pago = _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
    services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
    services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
    return pedido, pago


class TestEntregaConCobro:
    def test_vendedor_entrega_y_cobra(self, comprador, vendedor, puesto, producto):
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pedido.estado == E.ENTREGADO
        assert pago.estado == Pago.Estado.APROBADO
        assert pago.fecha_aprobacion is not None

    def test_neto_y_comision_igual_que_confirmar_efectivo(
        self, comprador, vendedor, puesto, producto, settings
    ):
        settings.PLATFORM_COMMISSION_PERCENTAGE = "5"
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()

        # Referencia: otro pedido idéntico cobrado con el servicio de pagos.
        otro = _crear_retiro(comprador, puesto, producto)
        referencia = _pago(otro, comprador, Pago.MetodoPago.EFECTIVO)
        referencia = pagos_services.confirmar_efectivo(pago=referencia, usuario=vendedor)

        assert pago.comision_plataforma == referencia.comision_plataforma > Decimal("0")
        assert pago.neto_vendedor == referencia.neto_vendedor
        assert pago.total_cobrado == referencia.total_cobrado
        assert pago.neto_vendedor == pago.subtotal_pedido - pago.comision_plataforma

    def test_admin_entrega_y_cobra(self, comprador, vendedor, admin, puesto, producto):
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        services.marcar_entregado(pedido=pedido, usuario=admin)
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.APROBADO

    def test_comprador_no_cierra_un_efectivo_pendiente(
        self, cliente_comprador, comprador, vendedor, puesto, producto
    ):
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "vendedor debe confirmar el cobro" in str(respuesta.data)
        pedido.refresh_from_db()
        pago.refresh_from_db()
        assert pedido.estado == E.LISTO_PARA_RECOGER
        assert pago.estado == Pago.Estado.PENDIENTE

    def test_acciones_con_efectivo_pendiente_solo_el_vendedor_y_admin_entregan(
        self, comprador, vendedor, admin, puesto, producto
    ):
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        assert "entregar" not in services.acciones_disponibles(pedido, comprador)
        assert "entregar" in services.acciones_disponibles(pedido, vendedor)
        assert "entregar" in services.acciones_disponibles(pedido, admin)
        assert "confirmar-pago" in services.acciones_disponibles(pedido, vendedor)
        # Ya cobrado: el comprador también puede cerrar la entrega.
        pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor)
        pedido.refresh_from_db()
        assert "entregar" in services.acciones_disponibles(pedido, comprador)

    def test_comprador_entrega_si_el_efectivo_ya_fue_cobrado(
        self, comprador, vendedor, puesto, producto
    ):
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor)
        services.marcar_entregado(pedido=pedido, usuario=comprador)
        assert pedido.estado == E.ENTREGADO

    def test_retiro_con_pago_aprobado_de_otro_metodo_se_entrega_sin_mas(
        self, comprador, vendedor, puesto, producto, aprobar_pago
    ):
        pedido = _crear_retiro(comprador, puesto, producto)
        pago = aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pedido.estado == E.ENTREGADO
        assert pago.estado == Pago.Estado.APROBADO

    def test_si_el_cobro_falla_el_pedido_no_queda_entregado(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        pedido, _ = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)

        def romper(**_kwargs):
            raise DjangoValidationError({"pago": "falló"})

        monkeypatch.setattr(pagos_services, "confirmar_efectivo", romper)
        with pytest.raises(DjangoValidationError):
            services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pedido.refresh_from_db()
        assert pedido.estado == E.LISTO_PARA_RECOGER

    def test_flujo_completo_por_api(
        self, cliente_comprador, cliente_vendedor, comprador, vendedor, puesto, producto
    ):
        pedido = _crear_retiro(comprador, puesto, producto)
        _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
        for accion in ("confirmar", "en-preparacion", "listo-para-recoger"):
            respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/{accion}/")
            assert respuesta.status_code == status.HTTP_200_OK, respuesta.data
        detalle = cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/").data
        assert detalle["estado"] == "listo_para_recoger"
        assert "entregar" not in detalle["acciones_permitidas"]  # efectivo sin cobrar
        detalle_vendedor = cliente_vendedor.get(f"{PEDIDOS}{pedido.pk}/").data
        assert "entregar" in detalle_vendedor["acciones_permitidas"]
        assert "confirmar-pago" in detalle_vendedor["acciones_permitidas"]
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_200_OK, respuesta.data
        assert respuesta.data["estado"] == "entregado"
        pedido.refresh_from_db()
        assert pedido.pago.estado == Pago.Estado.APROBADO


class TestCancelarRetiro:
    def test_cancelar_desde_listo_repone_stock_y_anula_el_pago(
        self, comprador, vendedor, puesto, producto
    ):
        pedido, pago = _retiro_efectivo_listo(comprador, vendedor, puesto, producto)
        producto.refresh_from_db()
        assert producto.stock == 8
        services.cancelar_pedido(pedido=pedido, usuario=vendedor)
        producto.refresh_from_db()
        pago.refresh_from_db()
        assert pedido.estado == E.CANCELADO
        assert producto.stock == 10
        assert pago.estado == Pago.Estado.ANULADO

    def test_cancelar_desde_listo_reembolsa_un_pago_aprobado(
        self, comprador, vendedor, puesto, producto, aprobar_pago
    ):
        pedido = _crear_retiro(comprador, puesto, producto)
        pago = aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        pago.refresh_from_db()
        assert pedido.estado == E.CANCELADO
        assert pago.estado == Pago.Estado.REEMBOLSADO


# ---------------------------------------------------------------------------
# «No me ha llegado»
# ---------------------------------------------------------------------------
class TestNoRecibidoSoloDomicilio:
    @pytest.mark.parametrize("estado", [E.LISTO_PARA_RECOGER, E.EN_CAMINO])
    def test_un_retiro_no_se_puede_reportar(self, estado, cliente_comprador, comprador, puesto):
        pedido = _retiro(comprador, puesto, estado)  # en_camino: dato heredado, sigue rechazado
        with pytest.raises(DjangoValidationError) as error:
            services.reportar_no_recibido(pedido=pedido, usuario=comprador)
        assert "estado" in error.value.message_dict
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/no-recibido/", {}, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        pedido.refresh_from_db()
        assert pedido.no_recibido_en is None

    def test_la_accion_no_se_ofrece_en_retiro(self, comprador, admin, puesto):
        pedido = _retiro(comprador, puesto, E.LISTO_PARA_RECOGER)
        assert "no-recibido" not in services.acciones_disponibles(pedido, comprador)
        assert "no-recibido" not in services.acciones_disponibles(pedido, admin)

    def test_en_domicilio_sigue_disponible(self, comprador, puesto_domicilio):
        pedido = _domicilio(comprador, puesto_domicilio, E.EN_CAMINO)
        assert "no-recibido" in services.acciones_disponibles(pedido, comprador)


# ---------------------------------------------------------------------------
# Serialización y notificaciones
# ---------------------------------------------------------------------------
class TestSerializacionYAvisos:
    def test_acciones_permitidas_por_api_en_retiro(
        self, cliente_vendedor, cliente_comprador, comprador, puesto
    ):
        pedido = _retiro(comprador, puesto, E.EN_PREPARACION)
        assert cliente_vendedor.get(f"{PEDIDOS}{pedido.pk}/").data["acciones_permitidas"] == [
            "listo-para-recoger",
            "cancelar",
        ]
        assert cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/").data["acciones_permitidas"] == [
            "cancelar"
        ]

    def test_filtro_por_estado_acepta_listo_para_recoger(self, cliente_vendedor, comprador, puesto):
        listo = _retiro(comprador, puesto, E.LISTO_PARA_RECOGER)
        _retiro(comprador, puesto, E.PENDIENTE)
        respuesta = cliente_vendedor.get(PEDIDOS, {"estado": "listo_para_recoger"})
        assert [p["id"] for p in respuesta.data["results"]] == [listo.pk]

    def test_aviso_de_listo_para_recoger_nombra_el_puesto(
        self, comprador, vendedor, puesto, producto
    ):
        pedido = _crear_retiro(comprador, puesto, producto)
        _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        aviso = Notificacion.objects.get(
            id_usuario=comprador, tipo=Notificacion.Tipo.PEDIDO_LISTO_PARA_RECOGER
        )
        assert aviso.mensaje == (
            f"Tu pedido #{pedido.pk} está listo para recoger en {puesto.nombre}."
        )
        assert not Notificacion.objects.filter(
            id_pedido=pedido, tipo=Notificacion.Tipo.PEDIDO_EN_CAMINO
        ).exists()

    def test_aviso_en_camino_de_domicilio_no_habla_de_retirar(
        self, comprador, vendedor, puesto_domicilio
    ):
        pedido = _domicilio(comprador, puesto_domicilio, E.EN_PREPARACION)
        services.marcar_enviado(pedido=pedido, usuario=vendedor)
        aviso = Notificacion.objects.get(
            id_usuario=comprador, tipo=Notificacion.Tipo.PEDIDO_EN_CAMINO
        )
        assert "retirar" not in aviso.mensaje and "recoger" not in aviso.mensaje

    def test_el_resto_de_avisos_del_retiro_no_dicen_en_camino(
        self, comprador, vendedor, puesto, producto
    ):
        pedido = _crear_retiro(comprador, puesto, producto)
        _pago(pedido, comprador, Pago.MetodoPago.EFECTIVO)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        textos = " ".join(
            f"{n.titulo} {n.mensaje}" for n in Notificacion.objects.filter(id_pedido=pedido)
        ).lower()
        assert "en camino" not in textos
        assert Notificacion.objects.filter(
            id_pedido=pedido, tipo=Notificacion.Tipo.PEDIDO_ENTREGADO
        ).exists()
