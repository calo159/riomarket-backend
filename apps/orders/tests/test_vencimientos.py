"""Apartar con plazo (ADR-012): fijar el plazo, cancelar lo vencido y dar más tiempo.

Este paquete cancela pedidos sin intervención humana, así que las pruebas cubren sobre todo
lo que NUNCA debe cancelarse (domicilios, pagos aprobados, estados finales, plazos futuros),
la idempotencia y la convivencia con «Entregar y cobrar».
"""

import logging
import threading
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext, override_settings
from django.utils import timezone
from rest_framework import status

from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Producto
from apps.notifications.models import Notificacion
from apps.orders import services, vencimientos
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from apps.promotions.models import UsoCupon
from tests.factories import CuponFactory, PedidoFactory, ProductoFactory, PuestoFactory

from .conftest import PEDIDOS
from .test_services import datos_pedido

pytestmark = pytest.mark.django_db

E = Pedido.Estado
EFECTIVO = Pago.MetodoPago.EFECTIVO


@pytest.fixture(autouse=True)
def _cache_limpia():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def ahora():
    return timezone.now()


# ---------------------------------------------------------------------------
# Ayudas
# ---------------------------------------------------------------------------
def _retiro(comprador, puesto, producto, cantidad=2, **extra):
    return services.crear_pedido(
        usuario=comprador, datos=datos_pedido(puesto, [(producto, cantidad)], **extra)
    )


def _pago(pedido, comprador, metodo=EFECTIVO):
    return pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": metodo}
    )


def _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=2, **extra):
    """Retiro con efectivo pendiente llevado hasta «listo para recoger»."""
    pedido = _retiro(comprador, puesto, producto, cantidad, **extra)
    pago = _pago(pedido, comprador)
    services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
    services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
    return pedido, pago


def _vencer(pedido, ahora, hace=timedelta(minutes=1)):
    """Deja el plazo del pedido vencido ``hace`` antes de ``ahora``."""
    Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora - hace)


def _recargar(pedido):
    return Pedido.objects.get(pk=pedido.pk)


# ---------------------------------------------------------------------------
# Fijar y limpiar el plazo
# ---------------------------------------------------------------------------
class TestFijarPlazo:
    def test_crear_retiro_fija_plazo_de_confirmacion(self, comprador, puesto, producto):
        antes = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        assert pedido.vence_en is not None
        esperado = antes + timedelta(hours=24)
        assert abs(pedido.vence_en - esperado) < timedelta(minutes=1)
        assert _recargar(pedido).vence_en == pedido.vence_en

    def test_el_plazo_de_confirmacion_se_configura(self, comprador, puesto, producto, settings):
        settings.PEDIDOS_PLAZO_CONFIRMACION_HORAS = 5
        antes = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        assert abs(pedido.vence_en - (antes + timedelta(hours=5))) < timedelta(minutes=1)

    def test_crear_domicilio_no_tiene_plazo(self, comprador, puesto_domicilio, producto_domicilio):
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(
                puesto_domicilio,
                [(producto_domicilio, 1)],
                tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                direccion_entrega="Calle 15 #7-42",
            ),
        )
        assert pedido.vence_en is None
        assert _recargar(pedido).vence_en is None

    def test_confirmar_quita_el_plazo(self, comprador, vendedor, puesto, producto):
        pedido = _retiro(comprador, puesto, producto)
        _pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert _recargar(pedido).vence_en is None

    def test_en_preparacion_no_tiene_plazo(self, comprador, vendedor, puesto, producto):
        pedido = _retiro(comprador, puesto, producto)
        _pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        assert _recargar(pedido).vence_en is None

    def test_listo_para_recoger_con_efectivo_fija_plazo_del_puesto(
        self, comprador, vendedor, puesto, producto
    ):
        puesto.plazo_retiro_horas = 48
        puesto.save()
        antes = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        assert abs(_recargar(pedido).vence_en - (antes + timedelta(hours=48))) < timedelta(
            minutes=1
        )

    def test_listo_para_recoger_pagado_no_tiene_plazo(
        self, comprador, vendedor, puesto, producto, aprobar_pago
    ):
        pedido = _retiro(comprador, puesto, producto)
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        assert _recargar(pedido).vence_en is None

    def test_listo_para_recoger_con_otro_metodo_no_tiene_plazo(
        self, comprador, vendedor, puesto, producto
    ):
        pedido = _retiro(comprador, puesto, producto)
        pago = _pago(pedido, comprador, Pago.MetodoPago.NEQUI)
        # Un pago de pasarela aprobado deja al pedido sin plazo; aquí se prueba que, aunque
        # el pago no sea efectivo, el estado «listo» no inventa un plazo.
        pagos_services._aplicar_estado(pago=pago, destino=Pago.Estado.APROBADO)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        assert _recargar(pedido).vence_en is None

    def test_aprobar_el_pago_quita_el_plazo(self, comprador, puesto, producto, aprobar_pago):
        pedido = _retiro(comprador, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(aviso_vencimiento_en=timezone.now())
        assert _recargar(pedido).vence_en is not None
        aprobar_pago(pedido, comprador)
        recargado = _recargar(pedido)
        assert recargado.vence_en is None
        assert recargado.aviso_vencimiento_en is None

    def test_cobrar_el_efectivo_en_mano_quita_el_plazo(self, comprador, vendedor, puesto, producto):
        pedido, pago = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        assert _recargar(pedido).vence_en is not None
        pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor)
        assert _recargar(pedido).vence_en is None

    def test_cancelar_a_mano_quita_el_plazo_y_no_deja_motivo(self, comprador, puesto, producto):
        pedido = _retiro(comprador, puesto, producto)
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        recargado = _recargar(pedido)
        assert recargado.vence_en is None
        assert recargado.motivo_cancelacion == ""

    def test_entregar_quita_el_plazo(self, comprador, vendedor, puesto, producto):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        recargado = _recargar(pedido)
        assert recargado.vence_en is None
        assert recargado.estado == E.ENTREGADO


# ---------------------------------------------------------------------------
# Cancelar lo vencido
# ---------------------------------------------------------------------------
class TestCancelarVencidos:
    def test_cancela_listo_para_recoger_vencido_y_repone_stock_cupon_y_pago(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        cupon = CuponFactory(id_puesto=puesto, valor=Decimal("500.00"), usos_totales=1)
        pedido, pago = _listo_con_efectivo(
            comprador, vendedor, puesto, producto, cantidad=4, codigo_cupon=cupon.codigo
        )
        producto.refresh_from_db()
        assert producto.stock == 6
        assert UsoCupon.objects.filter(id_pedido=pedido).count() == 1
        _vencer(pedido, ahora)

        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == [pedido.pk]
        recargado = _recargar(pedido)
        assert recargado.estado == E.CANCELADO
        assert recargado.motivo_cancelacion == "no_recogido"
        assert recargado.vence_en is None
        producto.refresh_from_db()
        assert producto.stock == 10
        assert UsoCupon.objects.filter(id_pedido=pedido).count() == 0
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.ANULADO

    @pytest.mark.parametrize("variante", ["sin_pago", "efectivo_pendiente", "rechazado"])
    def test_cancela_pendiente_vencido_sin_pago_aprobado(
        self, variante, comprador, puesto, producto
    ):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto, cantidad=3)
        if variante == "efectivo_pendiente":
            _pago(pedido, comprador)
        elif variante == "rechazado":
            pago = _pago(pedido, comprador, Pago.MetodoPago.SIMULADO)
            pagos_services._aplicar_estado(pago=pago, destino=Pago.Estado.RECHAZADO)
        _vencer(pedido, ahora)

        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == [pedido.pk]
        recargado = _recargar(pedido)
        assert recargado.estado == E.CANCELADO
        assert recargado.motivo_cancelacion == "no_confirmado"
        producto.refresh_from_db()
        assert producto.stock == 10

    @pytest.mark.parametrize("estado", [E.PENDIENTE, E.LISTO_PARA_RECOGER])
    def test_no_cancela_si_el_pago_se_aprobo_y_limpia_el_plazo(
        self, estado, comprador, puesto, producto
    ):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        pago = _pago(pedido, comprador)
        # Estado inconsistente a propósito: pago aprobado pero el plazo sigue puesto
        # (p. ej. el pago se aprobó por un camino que no limpió el plazo).
        Pedido.objects.filter(pk=pedido.pk).update(estado=estado)
        Pago.objects.filter(pk=pago.pk).update(estado=Pago.Estado.APROBADO)
        _vencer(pedido, ahora)

        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == []
        recargado = _recargar(pedido)
        assert recargado.estado == estado
        assert recargado.vence_en is None
        producto.refresh_from_db()
        assert producto.stock == 8  # el stock sigue descontado: la venta es real

    def test_no_cancela_listo_pagado_con_otro_metodo(self, comprador, puesto, producto):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        _pago(pedido, comprador, Pago.MetodoPago.NEQUI)
        Pedido.objects.filter(pk=pedido.pk).update(estado=E.LISTO_PARA_RECOGER)
        _vencer(pedido, ahora)
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)
        assert resultado.cancelados == []
        assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER

    def test_no_cancela_listo_sin_pago_registrado(self, comprador, puesto, producto):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(estado=E.LISTO_PARA_RECOGER)
        _vencer(pedido, ahora)
        assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == []
        assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER

    @pytest.mark.parametrize(
        "estado",
        [E.PENDIENTE, E.CONFIRMADO, E.EN_PREPARACION, E.EN_CAMINO, E.LISTO_PARA_RECOGER],
    )
    def test_nunca_cancela_un_domicilio(
        self, estado, comprador, puesto_domicilio, producto_domicilio
    ):
        ahora = timezone.now()
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(
                puesto_domicilio,
                [(producto_domicilio, 2)],
                tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                direccion_entrega="Calle 15 #7-42",
            ),
        )
        _pago(pedido, comprador)
        # Estado inconsistente a propósito: aunque un domicilio tuviera un plazo vencido,
        # el barrido no lo toca.
        Pedido.objects.filter(pk=pedido.pk).update(estado=estado)
        _vencer(pedido, ahora, hace=timedelta(days=30))

        resultado = vencimientos.barrer(ahora=ahora)

        assert resultado.cancelados == []
        assert _recargar(pedido).estado == estado
        producto_domicilio.refresh_from_db()
        assert producto_domicilio.stock == 8

    @pytest.mark.parametrize(
        "estado", [E.CONFIRMADO, E.EN_PREPARACION, E.EN_CAMINO, E.ENTREGADO, E.CANCELADO]
    )
    def test_nunca_toca_retiros_en_otros_estados(self, estado, comprador, puesto, producto):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        _pago(pedido, comprador)
        Pedido.objects.filter(pk=pedido.pk).update(estado=estado)
        _vencer(pedido, ahora, hace=timedelta(days=30))

        resultado = vencimientos.barrer(ahora=ahora)

        assert resultado.cancelados == []
        assert _recargar(pedido).estado == estado
        producto.refresh_from_db()
        assert producto.stock == 8

    def test_no_cancela_pedidos_sin_vencer_ni_en_el_limite(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)

        # Falta un microsegundo: todavía no vence.
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora + timedelta(microseconds=1))
        assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == []
        assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER

        # Falta un segundo, una hora, un día: tampoco.
        for falta in (timedelta(seconds=1), timedelta(hours=1), timedelta(days=1)):
            Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora + falta)
            assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == []
            assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER

        # Un pedido sin plazo (NULL) jamás vence.
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=None)
        assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == []
        assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER

    def test_el_instante_exacto_del_vencimiento_ya_vence(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora)
        assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == [pedido.pk]

    def test_es_idempotente_dos_barridos_cancelan_una_vez(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=4)
        _vencer(pedido, ahora)

        primero = vencimientos.barrer(ahora=ahora)
        segundo = vencimientos.barrer(ahora=ahora)

        assert primero.cancelados == [pedido.pk]
        assert segundo.cancelados == []
        producto.refresh_from_db()
        assert producto.stock == 10  # repuesto una sola vez (no 14)
        assert Notificacion.objects.filter(tipo="pedido_vencido", id_pedido=pedido).count() == 2
        assert RegistroAuditoria.objects.filter(accion="vencimiento").count() == 1

    def test_dos_barridos_con_la_lista_vieja_tampoco_repiten(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        """Dos procesos leyeron la misma lista de vencidos: el segundo ya no encuentra nada."""
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=4)
        _vencer(pedido, ahora)
        real = vencimientos._buscar_candidatos
        listas = []

        def espiar(*args, **kwargs):
            resultado = real(*args, **kwargs)
            listas.append(resultado)
            return resultado

        monkeypatch.setattr(vencimientos, "_buscar_candidatos", espiar)
        vencimientos.cancelar_vencidos(ahora=ahora)
        # Segundo proceso con la lista vieja (el pedido ya figuraba como vencido).
        monkeypatch.setattr(vencimientos, "_buscar_candidatos", lambda *a, **k: listas[0])
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == []
        producto.refresh_from_db()
        assert producto.stock == 10

    def test_respeta_el_limite_por_barrido(self, comprador, vendedor, puesto):
        ahora = timezone.now()
        pedidos = []
        for _ in range(5):
            producto = ProductoFactory(id_puesto=puesto)
            pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=1)
            pedidos.append(pedido)
        for indice, pedido in enumerate(pedidos):
            _vencer(pedido, ahora, hace=timedelta(minutes=10 - indice))

        primero = vencimientos.cancelar_vencidos(ahora=ahora, limite=2)
        assert len(primero.cancelados) == 2
        # Primero los que llevan más tiempo vencidos.
        assert primero.cancelados == [pedidos[0].pk, pedidos[1].pk]
        assert Pedido.objects.filter(estado=E.CANCELADO).count() == 2

        segundo = vencimientos.cancelar_vencidos(ahora=ahora, limite=2)
        assert segundo.cancelados == [pedidos[2].pk, pedidos[3].pk]
        tercero = vencimientos.cancelar_vencidos(ahora=ahora, limite=2)
        assert tercero.cancelados == [pedidos[4].pk]
        assert Pedido.objects.filter(estado=E.CANCELADO).count() == 5

    def test_sin_limite_cancela_todo(self, comprador, vendedor, puesto):
        ahora = timezone.now()
        for _ in range(3):
            producto = ProductoFactory(id_puesto=puesto)
            pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=1)
            _vencer(pedido, ahora)
        assert len(vencimientos.cancelar_vencidos(ahora=ahora).cancelados) == 3

    def test_el_limite_de_la_lectura_viene_de_la_configuracion(
        self, comprador, vendedor, puesto, settings
    ):
        settings.PEDIDOS_LIBERAR_EN_LECTURA = True
        settings.PEDIDOS_BARRIDO_LIMITE = 1
        for _ in range(3):
            producto = ProductoFactory(id_puesto=puesto)
            pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=1)
            _vencer(pedido, timezone.now())
        resultado = vencimientos.barrer_si_toca()
        assert len(resultado.cancelados) == 1

    def test_un_error_en_un_pedido_no_detiene_el_resto(
        self, comprador, vendedor, puesto, monkeypatch, caplog
    ):
        ahora = timezone.now()
        producto_a = ProductoFactory(id_puesto=puesto)
        producto_b = ProductoFactory(id_puesto=puesto)
        malo, pago_malo = _listo_con_efectivo(comprador, vendedor, puesto, producto_a, cantidad=3)
        bueno, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto_b, cantidad=3)
        _vencer(malo, ahora, hace=timedelta(hours=2))  # va primero
        _vencer(bueno, ahora)

        real = services._reponer_stock

        def reponer_con_fallo(pedido):
            if pedido.pk == malo.pk:
                raise RuntimeError("fallo simulado")
            return real(pedido)

        monkeypatch.setattr(services, "_reponer_stock", reponer_con_fallo)
        with caplog.at_level(logging.ERROR):
            resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == [bueno.pk]
        assert any("fallo simulado" in str(r.exc_info) for r in caplog.records if r.exc_info)
        # El pedido con error quedó intacto: nada a medias.
        assert _recargar(malo).estado == E.LISTO_PARA_RECOGER
        pago_malo.refresh_from_db()
        assert pago_malo.estado == Pago.Estado.PENDIENTE
        producto_a.refresh_from_db()
        assert producto_a.stock == 7
        assert _recargar(bueno).estado == E.CANCELADO

    def test_barrer_vuelve_a_intentar_el_pedido_que_fallo(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        real = services._reponer_stock
        monkeypatch.setattr(
            services, "_reponer_stock", lambda p: (_ for _ in ()).throw(RuntimeError("x"))
        )
        assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == []
        monkeypatch.setattr(services, "_reponer_stock", real)
        assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == [pedido.pk]

    def test_un_fallo_al_notificar_no_deshace_la_cancelacion(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        from apps.notifications import services as notif

        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)

        def fallar(**kwargs):
            raise RuntimeError("correo caído")

        monkeypatch.setattr(notif, "notificar_pedido_vencido", fallar)
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)
        assert resultado.cancelados == [pedido.pk]
        assert _recargar(pedido).estado == E.CANCELADO


# ---------------------------------------------------------------------------
# Notificaciones y auditoría
# ---------------------------------------------------------------------------
class TestNotificacionesYAuditoria:
    def test_notifica_al_comprador_y_al_vendedor_con_el_motivo(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        vencimientos.cancelar_vencidos(ahora=ahora)

        avisos = Notificacion.objects.filter(id_pedido=pedido, tipo="pedido_vencido")
        assert {a.id_usuario_id for a in avisos} == {comprador.pk, vendedor.pk}
        del_comprador = avisos.get(id_usuario=comprador)
        del_vendedor = avisos.get(id_usuario=vendedor)
        assert del_comprador.titulo == "Pedido cancelado por plazo"
        assert f"Tu pedido #{pedido.pk} se canceló porque no se recogió antes del" in (
            del_comprador.mensaje
        )
        assert f"El pedido #{pedido.pk} se canceló solo: no se recogió a tiempo." in (
            del_vendedor.mensaje
        )
        assert "El stock volvió a tu puesto." in del_vendedor.mensaje

    def test_notifica_el_motivo_de_no_confirmado(self, comprador, vendedor, puesto, producto):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        _vencer(pedido, ahora)
        vencimientos.cancelar_vencidos(ahora=ahora)

        avisos = Notificacion.objects.filter(id_pedido=pedido, tipo="pedido_vencido")
        assert avisos.get(id_usuario=comprador).mensaje == (
            f"Tu pedido #{pedido.pk} se canceló porque {puesto.nombre} no lo confirmó a tiempo."
        )
        assert avisos.get(id_usuario=vendedor).mensaje == (
            f"El pedido #{pedido.pk} se canceló solo porque no lo confirmaste en 24 horas."
        )

    def test_la_fecha_del_aviso_va_en_hora_de_colombia(self, comprador, vendedor, puesto, producto):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        # 2026-10-31 23:00 UTC = 18:00 en Colombia (UTC-5).
        limite = datetime(2026, 10, 31, 23, 0, tzinfo=UTC)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=limite)
        vencimientos.cancelar_vencidos(ahora=limite + timedelta(minutes=1))
        mensaje = Notificacion.objects.get(
            id_pedido=pedido, id_usuario=comprador, tipo="pedido_vencido"
        ).mensaje
        assert "31/10" in mensaje
        assert "6:00 p. m." in mensaje
        assert ".." not in mensaje  # «p. m.» ya trae su punto

    def test_audita_como_sistema(self, comprador, vendedor, puesto, producto):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        vencimientos.cancelar_vencidos(ahora=ahora)

        registro = RegistroAuditoria.objects.get(accion="vencimiento", id_entidad=pedido.pk)
        assert registro.id_usuario is None  # el sistema, no una persona
        assert registro.entidad == "pedido"
        assert registro.detalle["de"] == "listo_para_recoger"
        assert registro.detalle["a"] == "cancelado"
        assert registro.detalle["motivo"] == "no_recogido"
        assert registro.detalle["origen"] == "lectura"
        assert "vence_en" in registro.detalle

    def test_no_usa_la_notificacion_generica_de_cancelado(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        vencimientos.cancelar_vencidos(ahora=ahora)
        assert not Notificacion.objects.filter(
            id_pedido=pedido, tipo=Notificacion.Tipo.PEDIDO_CANCELADO
        ).exists()

    def test_avisa_por_vencer_una_sola_vez(self, comprador, vendedor, puesto, producto):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora + timedelta(hours=1))

        primero = vencimientos.barrer(ahora=ahora)
        segundo = vencimientos.barrer(ahora=ahora + timedelta(minutes=5))

        assert primero.avisados == [pedido.pk]
        assert segundo.avisados == []
        avisos = Notificacion.objects.filter(id_pedido=pedido, tipo="pedido_por_vencer")
        assert avisos.count() == 1
        aviso = avisos.get()
        assert aviso.id_usuario_id == comprador.pk
        assert aviso.titulo == "Tu pedido vence pronto"
        assert f"Recoge tu pedido #{pedido.pk} en {puesto.nombre} antes del" in aviso.mensaje
        assert "Si no pasas, se cancela solo." in aviso.mensaje
        assert ".." not in aviso.mensaje
        assert _recargar(pedido).aviso_vencimiento_en is not None
        assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER

    def test_avisa_al_vendedor_cuando_el_pedido_pendiente_esta_por_vencer(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora + timedelta(minutes=90))
        resultado = vencimientos.barrer(ahora=ahora)
        assert resultado.avisados == [pedido.pk]
        aviso = Notificacion.objects.get(id_pedido=pedido, tipo="pedido_por_vencer")
        assert aviso.id_usuario_id == vendedor.pk
        assert aviso.titulo == f"Confirma el pedido #{pedido.pk}"
        assert "se cancela solo y el producto vuelve a la venta" in aviso.mensaje

    def test_no_avisa_si_falta_mucho_ni_si_ya_vencio(self, comprador, vendedor, puesto, producto):
        ahora = timezone.now()
        lejos, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=1)
        vencido = _retiro(comprador, puesto, producto, cantidad=1)
        Pedido.objects.filter(pk=lejos.pk).update(vence_en=ahora + timedelta(hours=5))
        # Vencido pero fuera del tope del barrido: no debe recibir «vence pronto».
        Pedido.objects.filter(pk=vencido.pk).update(vence_en=ahora - timedelta(minutes=1))
        resultado = vencimientos.avisar_por_vencer(ahora=ahora)
        assert resultado == 0
        assert not Notificacion.objects.filter(tipo="pedido_por_vencer").exists()

    def test_dar_mas_tiempo_permite_un_aviso_nuevo(self, comprador, vendedor, puesto, producto):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora + timedelta(hours=1))
        vencimientos.barrer(ahora=ahora)
        vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor, ahora=ahora)
        assert _recargar(pedido).aviso_vencimiento_en is None


# ---------------------------------------------------------------------------
# Costo del barrido y candado
# ---------------------------------------------------------------------------
class TestCostoYCandado:
    def test_barrido_sin_vencidos_hace_una_consulta(self, comprador, puesto, producto):
        _retiro(comprador, puesto, producto)
        with CaptureQueriesContext(connection) as consultas:
            resultado = vencimientos.barrer(ahora=timezone.now())
        assert len(consultas) == 1
        assert (resultado.cancelados, resultado.avisados, resultado.omitidos) == ([], [], 0)

    def test_cancelar_vencidos_sin_vencidos_hace_una_consulta(self, comprador, puesto, producto):
        _retiro(comprador, puesto, producto)
        with CaptureQueriesContext(connection) as consultas:
            vencimientos.cancelar_vencidos(ahora=timezone.now())
        assert len(consultas) == 1

    def test_barrer_si_toca_respeta_el_candado_de_un_minuto(self, comprador, puesto, producto):
        _retiro(comprador, puesto, producto)
        with override_settings(PEDIDOS_LIBERAR_EN_LECTURA=True):
            with CaptureQueriesContext(connection) as primera:
                resultado = vencimientos.barrer_si_toca()
            with CaptureQueriesContext(connection) as segunda:
                otra = vencimientos.barrer_si_toca()
        assert resultado is not None
        assert len(primera) == 1
        assert otra is None
        assert len(segunda) == 0

    def test_el_candado_se_libera_al_pasar_el_minuto(self, settings):
        settings.PEDIDOS_LIBERAR_EN_LECTURA = True
        assert vencimientos.barrer_si_toca() is not None
        assert vencimientos.barrer_si_toca() is None
        cache.delete("orders:barrido_vencidos")
        assert vencimientos.barrer_si_toca() is not None

    def test_barrer_si_toca_desactivado_en_lectura(self, settings):
        settings.PEDIDOS_LIBERAR_EN_LECTURA = False
        with CaptureQueriesContext(connection) as consultas:
            assert vencimientos.barrer_si_toca() is None
        assert len(consultas) == 0
        # Ni siquiera toma el candado.
        assert cache.get("orders:barrido_vencidos") is None

    def test_en_las_pruebas_la_liberacion_en_lectura_esta_apagada(self):
        from django.conf import settings as ajustes

        assert ajustes.PEDIDOS_LIBERAR_EN_LECTURA is False

    def test_un_error_del_barrido_no_sale_de_barrer_si_toca(self, settings, monkeypatch):
        settings.PEDIDOS_LIBERAR_EN_LECTURA = True

        def romper(**kwargs):
            raise RuntimeError("base caída")

        monkeypatch.setattr(vencimientos, "barrer", romper)
        assert vencimientos.barrer_si_toca() is None

    def test_si_la_cache_falla_la_lectura_no_se_rompe(self, settings, monkeypatch):
        settings.PEDIDOS_LIBERAR_EN_LECTURA = True

        def romper(*args, **kwargs):
            raise ConnectionError("redis caído")

        monkeypatch.setattr(vencimientos.cache, "add", romper)
        assert vencimientos.barrer_si_toca() is None


# ---------------------------------------------------------------------------
# Concurrencia con «Entregar y cobrar»
# ---------------------------------------------------------------------------
class TestCarreraConEntregar:
    def test_barrido_primero_y_luego_entregar_da_un_mensaje_claro(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, pago = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        # El vendedor ya tenía abierta una copia del pedido.
        vieja = _recargar(pedido)
        _vencer(pedido, ahora)
        vencimientos.cancelar_vencidos(ahora=ahora)

        with pytest.raises(DjangoValidationError) as error:
            services.marcar_entregado(pedido=_recargar(pedido), usuario=vendedor)
        assert error.value.message_dict["estado"] == [
            "Este pedido se canceló solo porque venció su plazo. "
            "Pídele al cliente que haga uno nuevo."
        ]
        # También con la copia vieja (estado leído antes del barrido).
        with pytest.raises(DjangoValidationError) as error:
            services.marcar_entregado(pedido=vieja, usuario=vendedor)
        assert "se canceló solo porque venció su plazo" in str(error.value)

        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.ANULADO
        with pytest.raises(DjangoValidationError):
            pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor)
        producto.refresh_from_db()
        assert producto.stock == 10

    def test_entregar_por_la_api_devuelve_400_con_el_mensaje(
        self, cliente_vendedor, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        vencimientos.cancelar_vencidos(ahora=ahora)
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "se canceló solo porque venció su plazo" in str(respuesta.data)

    def test_entregar_un_cancelado_a_mano_conserva_el_mensaje_generico(
        self, comprador, vendedor, puesto, producto
    ):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        services.cancelar_pedido(pedido=pedido, usuario=vendedor)
        with pytest.raises(DjangoValidationError) as error:
            services.marcar_entregado(pedido=_recargar(pedido), usuario=vendedor)
        assert "Transición inválida" in str(error.value)

    def test_si_el_vendedor_entrega_antes_el_barrido_no_toca_el_pedido(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        """El barrido ya tenía al pedido en su lista; entre la lista y el bloqueo se entregó."""
        ahora = timezone.now()
        pedido, pago = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        real = vencimientos._bloquear_pedido

        def entregar_y_bloquear(pk):
            services.marcar_entregado(pedido=_recargar(pedido), usuario=vendedor)
            return real(pk)

        monkeypatch.setattr(vencimientos, "_bloquear_pedido", entregar_y_bloquear)
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == []
        recargado = _recargar(pedido)
        assert recargado.estado == E.ENTREGADO
        assert recargado.motivo_cancelacion == ""
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.APROBADO
        producto.refresh_from_db()
        assert producto.stock == 8  # sigue vendido: el stock no se repuso
        assert not Notificacion.objects.filter(tipo="pedido_vencido").exists()

    def test_si_el_pago_se_aprueba_antes_del_bloqueo_no_se_cancela(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        ahora = timezone.now()
        pedido, pago = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        real = vencimientos._bloquear_pedido

        def cobrar_y_bloquear(pk):
            # Otro proceso cobra en mano el efectivo justo antes de que el barrido bloquee.
            Pago.objects.filter(pk=pago.pk).update(estado=Pago.Estado.APROBADO)
            return real(pk)

        monkeypatch.setattr(vencimientos, "_bloquear_pedido", cobrar_y_bloquear)
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == []
        recargado = _recargar(pedido)
        assert recargado.estado == E.LISTO_PARA_RECOGER
        assert recargado.vence_en is None
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.APROBADO

    def test_si_el_vendedor_da_mas_tiempo_antes_del_bloqueo_no_se_cancela(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        real = vencimientos._bloquear_pedido

        def extender_y_bloquear(pk):
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor, ahora=ahora)
            return real(pk)

        monkeypatch.setattr(vencimientos, "_bloquear_pedido", extender_y_bloquear)
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == []
        recargado = _recargar(pedido)
        assert recargado.estado == E.LISTO_PARA_RECOGER
        assert recargado.vence_en > ahora  # el plazo nuevo se respeta, no se borra

    def test_un_pedido_bloqueado_por_otra_peticion_se_salta(
        self, comprador, vendedor, puesto, producto, monkeypatch
    ):
        """Simula ``skip_locked``: la fila la tiene otra transacción, así que no se devuelve."""
        ahora = timezone.now()
        pedido, pago = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora)
        monkeypatch.setattr(vencimientos, "_bloquear_pedido", lambda pk: None)

        resultado = vencimientos.cancelar_vencidos(ahora=ahora)

        assert resultado.cancelados == []
        assert resultado.omitidos == 1
        assert _recargar(pedido).estado == E.LISTO_PARA_RECOGER
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.PENDIENTE
        producto.refresh_from_db()
        assert producto.stock == 8

    def test_el_bloqueo_pide_skip_locked_y_solo_la_fila_del_pedido(self, monkeypatch):
        """SQLite ignora los bloqueos; esta prueba fija que la consulta pide lo correcto."""
        from django.db.models import QuerySet

        capturado = {}
        original = QuerySet.select_for_update

        def espiar(self, *args, **kwargs):
            capturado.setdefault("llamadas", []).append(kwargs)
            return original(self, *args, **kwargs)

        monkeypatch.setattr(QuerySet, "select_for_update", espiar)
        with transaction.atomic():
            assert vencimientos._bloquear_pedido(999999) is None
        assert {"skip_locked": True} in capturado["llamadas"]

    def test_aprobar_un_pago_bloquea_primero_el_pedido(
        self, comprador, puesto, producto, monkeypatch
    ):
        """Orden de bloqueos pedido → pago en todos los caminos (evita interbloqueos)."""
        from django.db.models import QuerySet

        pedido = _retiro(comprador, puesto, producto)
        pago = _pago(pedido, comprador)
        modelos = []
        original = QuerySet.select_for_update

        def espiar(self, *args, **kwargs):
            modelos.append(self.model.__name__)
            return original(self, *args, **kwargs)

        monkeypatch.setattr(QuerySet, "select_for_update", espiar)
        pagos_services._aplicar_estado(pago=pago, destino=Pago.Estado.APROBADO)
        assert modelos.index("Pedido") < modelos.index("Pago")


@pytest.mark.skipif(
    connection.vendor != "postgresql",
    reason="SKIP LOCKED y los bloqueos de fila solo existen en PostgreSQL (el CI los ejecuta).",
)
@pytest.mark.django_db(transaction=True)
def test_carrera_entregar_y_barrido_postgresql(comprador, vendedor, puesto, producto):
    """Hilo A: «Entregar y cobrar» con el pedido bloqueado. Hilo principal: el barrido.

    El barrido debe omitir el pedido (sin esperar al candado) y el pedido queda entregado,
    con el cobro aprobado y el stock sin reponer.
    """
    ahora = timezone.now()
    pedido, pago = _listo_con_efectivo(comprador, vendedor, puesto, producto, cantidad=3)
    _vencer(pedido, ahora)
    bloqueado = threading.Event()
    seguir = threading.Event()
    errores = []

    def entregar():
        try:
            with transaction.atomic():
                Pedido.objects.select_for_update().get(pk=pedido.pk)
                bloqueado.set()
                seguir.wait(timeout=20)
                services.marcar_entregado(pedido=Pedido.objects.get(pk=pedido.pk), usuario=vendedor)
        except Exception as exc:  # pragma: no cover - solo si la prueba falla
            errores.append(exc)
        finally:
            bloqueado.set()
            connection.close()

    hilo = threading.Thread(target=entregar)
    hilo.start()
    try:
        assert bloqueado.wait(timeout=20)
        inicio = timezone.now()
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)
        # No se quedó esperando al candado del otro hilo.
        assert timezone.now() - inicio < timedelta(seconds=10)
        assert resultado.cancelados == []
        assert resultado.omitidos == 1
    finally:
        seguir.set()
        hilo.join(timeout=30)

    assert errores == []
    assert _recargar(pedido).estado == E.ENTREGADO
    pago.refresh_from_db()
    assert pago.estado == Pago.Estado.APROBADO
    producto.refresh_from_db()
    assert producto.stock == 7

    # Con todo ya entregado, el barrido siguiente tampoco toca nada.
    assert vencimientos.cancelar_vencidos(ahora=ahora).cancelados == []


# ---------------------------------------------------------------------------
# Dar más tiempo
# ---------------------------------------------------------------------------
class TestExtenderPlazo:
    def test_extender_plazo_suma_el_plazo_y_reinicia_el_aviso(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        puesto.plazo_retiro_horas = 12
        puesto.save()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        base = ahora + timedelta(hours=1)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=base, aviso_vencimiento_en=ahora)

        resultado = vencimientos.extender_plazo(
            pedido=_recargar(pedido), usuario=vendedor, ahora=ahora
        )

        assert resultado.vence_en == base + timedelta(hours=12)
        recargado = _recargar(pedido)
        assert recargado.vence_en == base + timedelta(hours=12)
        assert recargado.extensiones_plazo == 1
        assert recargado.aviso_vencimiento_en is None
        aviso = Notificacion.objects.get(id_pedido=pedido, tipo="general", id_usuario=comprador)
        assert aviso.titulo == "Tienes más tiempo"
        assert puesto.nombre in aviso.mensaje
        assert f"pedido #{pedido.pk}" in aviso.mensaje
        assert ".." not in aviso.mensaje
        registro = RegistroAuditoria.objects.get(accion="extender_plazo", id_entidad=pedido.pk)
        assert registro.id_usuario_id == vendedor.pk
        assert registro.detalle["extensiones"] == 1

    def test_si_ya_vencio_pero_no_se_barrio_se_cuenta_desde_ahora(
        self, comprador, vendedor, puesto, producto
    ):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        _vencer(pedido, ahora, hace=timedelta(hours=3))
        vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor, ahora=ahora)
        assert _recargar(pedido).vence_en == ahora + timedelta(hours=24)

    def test_en_pendiente_usa_el_plazo_de_confirmacion(
        self, comprador, vendedor, puesto, producto, settings
    ):
        settings.PEDIDOS_PLAZO_CONFIRMACION_HORAS = 10
        puesto.plazo_retiro_horas = 48
        puesto.save()
        ahora = timezone.now()
        pedido = _retiro(comprador, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora + timedelta(hours=1))
        vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor, ahora=ahora)
        assert _recargar(pedido).vence_en == ahora + timedelta(hours=11)

    def test_extender_plazo_maximo_dos_veces(self, comprador, vendedor, puesto, producto):
        ahora = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        for _ in range(2):
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor, ahora=ahora)
        vence = _recargar(pedido).vence_en
        with pytest.raises(DjangoValidationError) as error:
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor, ahora=ahora)
        assert error.value.message_dict["extensiones_plazo"] == [
            "Ya diste más tiempo dos veces a este pedido."
        ]
        recargado = _recargar(pedido)
        assert recargado.extensiones_plazo == 2
        assert recargado.vence_en == vence

    def test_el_limite_de_dos_tambien_esta_en_la_base(self, comprador, puesto, producto):
        from django.db import IntegrityError

        pedido = _retiro(comprador, puesto, producto)
        with pytest.raises(IntegrityError), transaction.atomic():
            Pedido.objects.filter(pk=pedido.pk).update(extensiones_plazo=3)

    def test_comprador_no_puede_extender_plazo(self, comprador, vendedor, puesto, producto):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        with pytest.raises(PermissionDenied):
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=comprador)
        assert _recargar(pedido).extensiones_plazo == 0

    def test_vendedor_de_otro_puesto_no_puede(
        self, comprador, vendedor, otro_vendedor, puesto, producto
    ):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        with pytest.raises(PermissionDenied):
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=otro_vendedor)
        assert _recargar(pedido).extensiones_plazo == 0

    def test_el_administrador_puede(self, comprador, vendedor, admin, puesto, producto):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=admin)
        assert _recargar(pedido).extensiones_plazo == 1

    def test_no_se_extiende_un_pedido_sin_plazo(self, comprador, vendedor, puesto, producto):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=None)
        with pytest.raises(DjangoValidationError) as error:
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor)
        assert error.value.message_dict["vence_en"] == ["Este pedido no tiene plazo."]

    def test_no_se_extiende_un_domicilio(self, comprador, vendedor, puesto_domicilio):
        pedido = PedidoFactory(
            id_comprador=comprador,
            id_puesto=puesto_domicilio,
            tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
        )
        with pytest.raises(DjangoValidationError) as error:
            vencimientos.extender_plazo(pedido=pedido, usuario=vendedor)
        assert "vence_en" in error.value.message_dict

    @pytest.mark.parametrize("estado", [E.CONFIRMADO, E.EN_PREPARACION, E.ENTREGADO, E.CANCELADO])
    def test_no_se_extiende_en_otros_estados(self, estado, comprador, vendedor, puesto, producto):
        pedido = _retiro(comprador, puesto, producto)
        Pedido.objects.filter(pk=pedido.pk).update(estado=estado)
        with pytest.raises(DjangoValidationError) as error:
            vencimientos.extender_plazo(pedido=_recargar(pedido), usuario=vendedor)
        assert error.value.message_dict["estado"] == [
            "Solo se da más tiempo a pedidos pendientes o listos para recoger."
        ]

    def test_por_la_api_el_vendedor_ve_la_accion_y_el_comprador_no(
        self, cliente_vendedor, cliente_comprador, comprador, vendedor, puesto, producto
    ):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        detalle = cliente_vendedor.get(f"{PEDIDOS}{pedido.pk}/").data
        assert "extender-plazo" in detalle["acciones_permitidas"]
        assert detalle["vence_en"] is not None
        assert detalle["extensiones_plazo"] == 0
        assert detalle["motivo_cancelacion"] == ""
        assert detalle["horas_extension"] == 24
        del_comprador = cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/").data
        assert "extender-plazo" not in del_comprador["acciones_permitidas"]
        assert del_comprador["vence_en"] == detalle["vence_en"]

    def test_por_la_api_el_boton_desaparece_tras_la_segunda_vez(
        self, cliente_vendedor, comprador, vendedor, puesto, producto
    ):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        url = f"{PEDIDOS}{pedido.pk}/extender-plazo/"
        primera = cliente_vendedor.post(url)
        assert primera.status_code == status.HTTP_200_OK
        assert primera.data["extensiones_plazo"] == 1
        assert "extender-plazo" in primera.data["acciones_permitidas"]
        segunda = cliente_vendedor.post(url)
        assert segunda.status_code == status.HTTP_200_OK
        assert "extender-plazo" not in segunda.data["acciones_permitidas"]
        tercera = cliente_vendedor.post(url)
        assert tercera.status_code == status.HTTP_400_BAD_REQUEST
        assert tercera.data["errors"]["extensiones_plazo"] == [
            "Ya diste más tiempo dos veces a este pedido."
        ]

    def test_por_la_api_el_comprador_recibe_403(
        self, cliente_comprador, comprador, vendedor, puesto, producto
    ):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/extender-plazo/")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_por_la_api_el_vendedor_ajeno_recibe_404_o_403(
        self, cliente_otro_vendedor, comprador, vendedor, puesto, producto
    ):
        pedido, _ = _listo_con_efectivo(comprador, vendedor, puesto, producto)
        respuesta = cliente_otro_vendedor.post(f"{PEDIDOS}{pedido.pk}/extender-plazo/")
        assert respuesta.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
        assert _recargar(pedido).extensiones_plazo == 0

    def test_por_la_api_sin_plazo_da_400(
        self, cliente_vendedor, comprador, puesto_domicilio, producto_domicilio
    ):
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(
                puesto_domicilio,
                [(producto_domicilio, 1)],
                tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                direccion_entrega="Calle 15 #7-42",
            ),
        )
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/extender-plazo/")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert respuesta.data["errors"]["vence_en"] == ["Este pedido no tiene plazo."]

    def test_los_campos_del_plazo_son_de_solo_lectura(
        self, cliente_comprador, comprador, puesto, producto
    ):
        pedido = _retiro(comprador, puesto, producto)
        antes = _recargar(pedido).vence_en
        respuesta = cliente_comprador.patch(
            f"{PEDIDOS}{pedido.pk}/",
            {
                "vence_en": "2099-01-01T00:00:00Z",
                "extensiones_plazo": 0,
                "motivo_cancelacion": "no_recogido",
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_200_OK
        recargado = _recargar(pedido)
        assert recargado.vence_en == antes
        assert recargado.motivo_cancelacion == ""


class TestPuestoDeOtroNoAfecta:
    def test_el_plazo_de_un_puesto_no_cambia_el_de_otro(
        self, comprador, vendedor, puesto, producto
    ):
        otro_puesto = PuestoFactory(id_vendedor=vendedor, plazo_retiro_horas=72)
        otro_producto = ProductoFactory(id_puesto=otro_puesto)
        antes = timezone.now()
        pedido, _ = _listo_con_efectivo(comprador, vendedor, otro_puesto, otro_producto)
        assert abs(_recargar(pedido).vence_en - (antes + timedelta(hours=72))) < timedelta(
            minutes=1
        )
        assert Producto.objects.get(pk=producto.pk).stock == 10
