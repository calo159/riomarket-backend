"""Fuente única de los montos del marketplace (Fase 4).

Antes de este módulo, ``orders.services`` fijaba la tarifa de domicilio en
``Decimal("0.00")`` mientras ``payments.services`` la calculaba desde
``settings``; el resultado era ``Pedido.total != Pago.total_cobrado``. Aquí
viven las fórmulas para que pedido y pago usen exactamente los mismos números.

Decisión de negocio (ADR-003): la comisión de plataforma se **descuenta al
vendedor** (``neto_vendedor = subtotal - comisión``); el comprador paga
``subtotal + tarifa_domicilio`` y la comisión nunca se suma a su total.
"""

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.conf import settings

CENTAVOS = Decimal("0.01")
CIEN = Decimal("100.00")


def _setting_decimal(nombre: str, default: str = "0.00") -> Decimal:
    """Lee un ajuste numérico como ``Decimal`` sin pasar por ``float``.

    ``django-environ`` no tiene un método ``decimal``; leer como texto y
    convertirlo evita los errores de punto flotante de ``env.float``.
    """
    valor = getattr(settings, nombre, default)
    if valor is None:
        valor = default
    try:
        return Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)


def _cuantizar(valor: Decimal) -> Decimal:
    return valor.quantize(CENTAVOS, rounding=ROUND_HALF_UP)


def tarifa_domicilio(*, es_domicilio: bool) -> Decimal:
    """Tarifa de envío vigente. ``0.00`` si el pedido es para retiro."""
    if not es_domicilio:
        return Decimal("0.00")
    tarifa = _setting_decimal("DOMICILIO_TARIFA_BASE")
    if tarifa < 0:
        tarifa = Decimal("0.00")
    return _cuantizar(tarifa)


def comision_plataforma(subtotal) -> Decimal:
    """Comisión de la plataforma sobre el subtotal (acotada a 0-100%)."""
    base = Decimal(str(subtotal or "0"))
    porcentaje = _setting_decimal("PLATFORM_COMMISSION_PERCENTAGE")
    if porcentaje <= 0:
        return Decimal("0.00")
    if porcentaje > CIEN:
        porcentaje = CIEN
    return _cuantizar(base * porcentaje / CIEN)


def neto_vendedor(subtotal, comision) -> Decimal:
    """Lo que recibe el vendedor: subtotal menos la comisión de plataforma."""
    resultado = Decimal(str(subtotal or "0")) - Decimal(str(comision or "0"))
    if resultado < 0:
        resultado = Decimal("0.00")
    return _cuantizar(resultado)
