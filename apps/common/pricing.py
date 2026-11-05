"""Fuente única de los montos del marketplace (Fase 4).

Antes de este módulo, ``orders.services`` fijaba la tarifa de domicilio en
``Decimal("0.00")`` mientras ``payments.services`` la calculaba desde
``settings``; el resultado era ``Pedido.total != Pago.total_cobrado``. Aquí
viven las fórmulas para que pedido y pago usen exactamente los mismos números.

Decisiones de negocio (ADR-003 y ADR-018):

- La comisión se **descuenta al vendedor** y nunca se suma al total del comprador.
- Se calcula sobre lo que el comprador paga por la **mercancía** (``subtotal - descuento``): si un
  cupón regala la mitad, la plataforma no cobra por la otra mitad. Antes se calculaba sobre el
  subtotal bruto y, con un cupón del 100 %, cobraba comisión por un pedido de $0.
- La tarifa de domicilio es de quien reparte, el puesto (``DOMICILIO_TARIFA_PARA_VENDEDOR``), y la
  comisión no se cobra sobre ella.
- ``neto_vendedor = subtotal - descuento - comisión (+ tarifa_domicilio)``.
"""

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.conf import settings

from apps.common import ajustes

CENTAVOS = Decimal("0.01")
CIEN = Decimal("100.00")


def _setting_decimal(nombre: str, default: str = "0.00") -> Decimal:
    """Lee un ajuste numérico como ``Decimal`` sin pasar por ``float``.

    ``django-environ`` no tiene un método ``decimal``; leer como texto y
    convertirlo evita los errores de punto flotante de ``env.float``.
    """
    valor = ajustes.valor(nombre, default)
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


def tarifa_para_vendedor() -> bool:
    """¿La tarifa de domicilio se le paga al puesto que reparte? (por defecto, sí)."""
    return bool(getattr(settings, "DOMICILIO_TARIFA_PARA_VENDEDOR", True))


def base_de_comision(subtotal, descuento=0) -> Decimal:
    """Lo que el comprador paga por la mercancía: subtotal menos el cupón (nunca negativo)."""
    base = Decimal(str(subtotal or "0")) - Decimal(str(descuento or "0"))
    return max(base, Decimal("0.00"))


def comision_plataforma(subtotal, descuento=0) -> Decimal:
    """Comisión de la plataforma sobre lo cobrado por la mercancía (acotada a 0-100 %)."""
    base = base_de_comision(subtotal, descuento)
    porcentaje = _setting_decimal("PLATFORM_COMMISSION_PERCENTAGE")
    if porcentaje <= 0:
        return Decimal("0.00")
    if porcentaje > CIEN:
        porcentaje = CIEN
    return _cuantizar(base * porcentaje / CIEN)


def neto_vendedor(subtotal, comision, *, descuento=0, tarifa_domicilio=0) -> Decimal:
    """Lo que recibe el vendedor: mercancía cobrada - comisión (+ el domicilio que reparte)."""
    resultado = base_de_comision(subtotal, descuento) - Decimal(str(comision or "0"))
    if tarifa_para_vendedor():
        resultado += Decimal(str(tarifa_domicilio or "0"))
    if resultado < 0:
        resultado = Decimal("0.00")
    return _cuantizar(resultado)
