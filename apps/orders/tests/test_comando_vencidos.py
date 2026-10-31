"""Comando ``cancelar_pedidos_vencidos``: el barrido a mano y al arrancar el servicio."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone

from apps.audit.models import RegistroAuditoria
from apps.orders import services
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from tests.factories import ProductoFactory

from .test_services import datos_pedido

pytestmark = pytest.mark.django_db


def _listo_vencido(comprador, vendedor, puesto, producto):
    pedido = services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 2)]))
    pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
    services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
    Pedido.objects.filter(pk=pedido.pk).update(vence_en=timezone.now() - timedelta(minutes=1))
    return pedido


def _correr(*args):
    salida = StringIO()
    call_command("cancelar_pedidos_vencidos", *args, stdout=salida)
    return salida.getvalue()


def test_dry_run_no_cancela(comprador, vendedor, puesto, producto):
    pedido = _listo_vencido(comprador, vendedor, puesto, producto)
    texto = _correr("--dry-run")
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.LISTO_PARA_RECOGER
    producto.refresh_from_db()
    assert producto.stock == 8
    assert f"#{pedido.pk}" in texto
    assert "dry-run" in texto.lower()
    assert not RegistroAuditoria.objects.filter(accion="vencimiento").exists()


def test_imprime_el_resumen(comprador, vendedor, puesto, producto):
    pedido = _listo_vencido(comprador, vendedor, puesto, producto)
    texto = _correr()
    assert "Revisados: 1 · Cancelados: 1 · Avisados: 0 · Omitidos: 0" in texto
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.CANCELADO
    producto.refresh_from_db()
    assert producto.stock == 10


def test_sin_vencidos_dice_cero(comprador, puesto, producto):
    texto = _correr()
    assert "Revisados: 0 · Cancelados: 0 · Avisados: 0 · Omitidos: 0" in texto


def test_el_comando_audita_con_origen_comando(comprador, vendedor, puesto, producto):
    pedido = _listo_vencido(comprador, vendedor, puesto, producto)
    _correr()
    registro = RegistroAuditoria.objects.get(accion="vencimiento", id_entidad=pedido.pk)
    assert registro.detalle["origen"] == "comando"
    assert registro.id_usuario is None


def test_limite_acota_lo_que_cancela(comprador, vendedor, puesto):
    pedidos = [
        _listo_vencido(comprador, vendedor, puesto, ProductoFactory(id_puesto=puesto))
        for _ in range(3)
    ]
    texto = _correr("--limite", "2")
    assert "Cancelados: 2" in texto
    estados = [Pedido.objects.get(pk=p.pk).estado for p in pedidos]
    assert estados.count(Pedido.Estado.CANCELADO) == 2


def test_el_comando_ignora_el_candado_de_la_lectura(comprador, vendedor, puesto, producto):
    cache.add("orders:barrido_vencidos", "1", timeout=60)
    pedido = _listo_vencido(comprador, vendedor, puesto, producto)
    _correr()
    pedido.refresh_from_db()
    assert pedido.estado == Pedido.Estado.CANCELADO
