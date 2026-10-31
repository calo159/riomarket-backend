"""Migración de datos orders.0010: plazo inicial de +24 h para los retiros que ya estaban abiertos.

Es la protección del día del despliegue: nada se cancela en masa, porque el plazo se cuenta
desde el momento de migrar y no desde la fecha de creación del pedido.
"""

from datetime import timedelta

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone

from apps.orders.models import Pedido
from apps.payments.models import Pago
from tests.factories import PagoFactory, PedidoFactory, PuestoFactory

ANTES = ("orders", "0009_pedido_vence_en")
DATOS = ("orders", "0010_vence_en_de_pedidos_abiertos")

E = Pedido.Estado


def _migrar(destino):
    ejecutor = MigrationExecutor(connection)
    ejecutor.migrate([destino])


def _dejar_en_el_ultimo_estado():
    ejecutor = MigrationExecutor(connection)
    ejecutor.migrate(ejecutor.loader.graph.leaf_nodes())


def _sembrar():
    """Un pedido por cada caso de la tabla de ADR-012 (todos sin plazo, como antes de C1)."""
    puesto = PuestoFactory(ofrece_domicilio=True, latitud="11.544000", longitud="-72.907000")
    casos = {}

    def pedido(nombre, estado=E.PENDIENTE, tipo=Pedido.TipoEntrega.RETIRO, pago=None):
        creado = PedidoFactory(id_puesto=puesto, estado=estado, tipo_entrega=tipo)
        if pago is not None:
            metodo, estado_pago = pago
            PagoFactory(id_pedido=creado, metodo_pago=metodo, estado=estado_pago)
        casos[nombre] = creado.pk

    efectivo = Pago.MetodoPago.EFECTIVO
    pedido("pendiente_sin_pago")
    pedido("pendiente_efectivo", pago=(efectivo, Pago.Estado.PENDIENTE))
    pedido("pendiente_rechazado", pago=(Pago.MetodoPago.NEQUI, Pago.Estado.RECHAZADO))
    pedido("pendiente_pagado", pago=(Pago.MetodoPago.SIMULADO, Pago.Estado.APROBADO))
    pedido("listo_efectivo_pendiente", E.LISTO_PARA_RECOGER, pago=(efectivo, Pago.Estado.PENDIENTE))
    pedido(
        "listo_efectivo_procesando", E.LISTO_PARA_RECOGER, pago=(efectivo, Pago.Estado.PROCESANDO)
    )
    pedido("listo_efectivo_cobrado", E.LISTO_PARA_RECOGER, pago=(efectivo, Pago.Estado.APROBADO))
    pedido(
        "listo_pagado_antes",
        E.LISTO_PARA_RECOGER,
        pago=(Pago.MetodoPago.SIMULADO, Pago.Estado.APROBADO),
    )
    pedido("listo_sin_pago", E.LISTO_PARA_RECOGER)
    pedido("confirmado", E.CONFIRMADO, pago=(efectivo, Pago.Estado.PENDIENTE))
    pedido("en_preparacion", E.EN_PREPARACION, pago=(efectivo, Pago.Estado.PENDIENTE))
    pedido("entregado", E.ENTREGADO, pago=(efectivo, Pago.Estado.APROBADO))
    pedido("cancelado", E.CANCELADO, pago=(efectivo, Pago.Estado.ANULADO))
    pedido(
        "domicilio_pendiente",
        tipo=Pedido.TipoEntrega.DOMICILIO,
        pago=(efectivo, Pago.Estado.PENDIENTE),
    )
    pedido("domicilio_en_camino", E.EN_CAMINO, tipo=Pedido.TipoEntrega.DOMICILIO)
    return casos


@pytest.mark.django_db(transaction=True)
def test_pone_plazo_a_retiros_abiertos_y_no_a_domicilios_ni_pagados():
    casos = _sembrar()
    try:
        _migrar(ANTES)  # revierte 0010: todos sin plazo
        assert not Pedido.objects.filter(vence_en__isnull=False).exists()

        antes = timezone.now()
        _migrar(DATOS)
        despues = timezone.now()

        plazos = dict(Pedido.objects.values_list("pk", "vence_en"))
        con_plazo = {
            "pendiente_sin_pago",
            "pendiente_efectivo",
            "pendiente_rechazado",
            "listo_efectivo_pendiente",
            "listo_efectivo_procesando",
        }
        for nombre, pk in casos.items():
            if nombre in con_plazo:
                vence = plazos[pk]
                assert vence is not None, nombre
                # Desde el momento de migrar, no desde la creación del pedido.
                assert antes + timedelta(hours=24) <= vence <= despues + timedelta(hours=24)
            else:
                assert plazos[pk] is None, nombre
        assert not Pedido.objects.filter(aviso_vencimiento_en__isnull=False).exists()
        assert not Pedido.objects.exclude(motivo_cancelacion="").exists()
        assert not Pedido.objects.exclude(extensiones_plazo=0).exists()
    finally:
        _dejar_en_el_ultimo_estado()


@pytest.mark.django_db(transaction=True)
def test_no_cancela_a_nadie_el_dia_del_despliegue():
    """Un retiro creado hace 10 días queda con 24 h por delante, no con el plazo ya vencido."""
    casos = _sembrar()
    viejo = casos["pendiente_sin_pago"]
    Pedido.objects.filter(pk=viejo).update(fecha_creacion=timezone.now() - timedelta(days=10))
    try:
        _migrar(ANTES)
        _migrar(DATOS)
        assert Pedido.objects.get(pk=viejo).vence_en > timezone.now() + timedelta(hours=23)

        from apps.orders import vencimientos

        resultado = vencimientos.barrer(ahora=timezone.now())
        assert resultado.cancelados == []
    finally:
        _dejar_en_el_ultimo_estado()


@pytest.mark.django_db(transaction=True)
def test_revertir_limpia_los_plazos():
    casos = _sembrar()
    try:
        _migrar(ANTES)
        _migrar(DATOS)
        assert Pedido.objects.filter(vence_en__isnull=False).exists()
        Pedido.objects.filter(pk=casos["pendiente_efectivo"]).update(
            aviso_vencimiento_en=timezone.now()
        )

        _migrar(ANTES)  # solo revierte 0010

        assert not Pedido.objects.filter(vence_en__isnull=False).exists()
        assert not Pedido.objects.filter(aviso_vencimiento_en__isnull=False).exists()
        # Los pedidos siguen ahí, sin tocar su estado.
        assert Pedido.objects.get(pk=casos["entregado"]).estado == E.ENTREGADO
        assert Pedido.objects.count() == len(casos)
    finally:
        _dejar_en_el_ultimo_estado()
