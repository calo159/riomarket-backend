"""Reglas de negocio de pagos (Fase 4)."""

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from apps.accounts.models import Usuario
from apps.orders.models import Pedido
from apps.payments.models import Pago


def _get_decimal_setting(name: str, default: Decimal) -> Decimal:
    try:
        valor = getattr(settings, name, default)
        if valor is None:
            return default
        return Decimal(str(valor))
    except Exception:
        return default


def tarifa_domicilio_pedido(*, pedido: Pedido) -> Decimal:
    if pedido.tipo_entrega != Pedido.TipoEntrega.DOMICILIO:
        return Decimal("0.00")
    tarifa = _get_decimal_setting("DOMICILIO_TARIFA_BASE", Decimal("0.00"))
    if tarifa < 0:
        tarifa = Decimal("0.00")
    return tarifa.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def comision_plataforma_subtotal(subtotal: Decimal) -> Decimal:
    porcentaje = _get_decimal_setting("PLATFORM_COMMISSION_PERCENTAGE", Decimal("0.00"))
    if porcentaje <= 0:
        return Decimal("0.00")
    if porcentaje > Decimal("100.00"):
        porcentaje = Decimal("100.00")
    comision = (subtotal * porcentaje / Decimal("100.00")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return comision


def crear_pago(*, pedido: Pedido, usuario: Usuario, datos: dict[str, Any]) -> Pago:
    if not usuario or not usuario.is_active:
        raise ValidationError({"no_autorizado": "Usuario no autorizado."})
    if not (usuario.es_administrador or pedido.id_comprador_id == usuario.pk):
        raise PermissionDenied("Solo el comprador o el administrador pueden crear el pago.")
    if hasattr(pedido, "pago"):
        raise ValidationError({"pago": "El pedido ya tiene un pago registrado."})
    if pedido.estado == Pedido.Estado.CANCELADO:
        raise ValidationError({"id_pedido": "No se puede pagar un pedido cancelado."})
    if pedido.estado == Pedido.Estado.ENTREGADO:
        raise ValidationError({"id_pedido": "El pedido ya fue entregado."})
    metodo = datos.get("metodo_pago") or Pago.MetodoPago.SIMULADO
    if metodo not in Pago.MetodoPago.values:
        raise ValidationError({"metodo_pago": f"Método de pago inválido: {metodo}."})
    tarifa_dom = tarifa_domicilio_pedido(pedido=pedido)
    comision = comision_plataforma_subtotal(pedido.subtotal)
    total_cobrado = pedido.subtotal + tarifa_dom
    with transaction.atomic():
        pago = Pago(
            id_pedido=pedido,
            metodo_pago=metodo,
            estado=Pago.Estado.PENDIENTE,
            subtotal_pedido=pedido.subtotal,
            tarifa_domicilio_aplicada=tarifa_dom,
            comision_plataforma=comision,
            total_cobrado=total_cobrado,
            notas=(datos.get("notas") or "").strip(),
            datos_sandbox={},
        )
        pago.full_clean()
        pago.save()
    return pago


def simular_pago(*, pago: Pago, usuario: Usuario, datos: dict[str, Any] | None = None) -> Pago:
    datos = datos or {}
    if not usuario or not usuario.is_active:
        raise PermissionDenied("Usuario no autorizado.")
    if not (usuario.es_administrador or pago.id_pedido.id_comprador_id == usuario.pk):
        raise PermissionDenied("Solo el comprador o el administrador pueden simular el pago.")
    if pago.estado != Pago.Estado.PENDIENTE and pago.estado != Pago.Estado.PROCESANDO:
        raise ValidationError({"estado": f"No se puede procesar un pago en estado {pago.estado}."})
    accion = (datos.get("accion") or "aprobar").strip().lower()
    referencia = (datos.get("referencia_gateway") or "").strip()
    with transaction.atomic():
        pago.estado = Pago.Estado.PROCESANDO
        pago.save(update_fields=["estado"])
        if accion == "rechazar":
            pago.estado = Pago.Estado.RECHAZADO
            pago.referencia_gateway = referencia or "sandbox-rechazado"
            pago.datos_sandbox = {
                "accion": "rechazar",
                "origen": "simulacion",
                "timestamp": timezone.now().isoformat(),
            }
            pago.fecha_aprobacion = None
        else:
            pago.estado = Pago.Estado.APROBADO
            pago.referencia_gateway = referencia or "sandbox-aprobado"
            pago.datos_sandbox = {
                "accion": "aprobar",
                "origen": "simulacion",
                "timestamp": timezone.now().isoformat(),
            }
            pago.fecha_aprobacion = timezone.now()
        pago.full_clean()
        pago.save()
    return pago


def marcar_reembolsado(
    *, pago: Pago, usuario: Usuario, datos: dict[str, Any] | None = None
) -> Pago:
    if not usuario or not usuario.is_active or not usuario.es_administrador:
        raise PermissionDenied("Solo el administrador puede marcar un reembolso.")
    if pago.estado != Pago.Estado.APROBADO:
        raise ValidationError({"estado": "Solo se puede reembolsar un pago aprobado."})
    datos = datos or {}
    with transaction.atomic():
        pago.estado = Pago.Estado.REEMBOLSADO
        pago.notas = (pago.notas + "\n" + (datos.get("notas") or "").strip()).strip()
        pago.datos_sandbox = {
            **pago.datos_sandbox,
            "reembolso": {"origen": "admin", "timestamp": timezone.now().isoformat()},
        }
        pago.save()
    return pago


def anular_pago(*, pago: Pago, usuario: Usuario, datos: dict[str, Any] | None = None) -> Pago:
    if not usuario or not usuario.is_active or not usuario.es_administrador:
        raise PermissionDenied("Solo el administrador puede anular un pago.")
    if pago.estado in (Pago.Estado.APROBADO, Pago.Estado.REEMBOLSADO):
        raise ValidationError({"estado": f"No se puede anular un pago en estado {pago.estado}."})
    datos = datos or {}
    with transaction.atomic():
        pago.estado = Pago.Estado.ANULADO
        pago.notas = (pago.notas + "\n" + (datos.get("notas") or "").strip()).strip()
        pago.save()
    return pago


def visibles_pagos(usuario: Usuario, qs: QuerySet[Pago], params: dict[str, Any]) -> QuerySet[Pago]:
    if not usuario or not usuario.is_authenticated:
        return qs.none()
    if usuario.es_administrador:
        return qs
    if usuario.es_comprador:
        return qs.filter(id_pedido__id_comprador_id=usuario.pk)
    if usuario.es_vendedor:
        return qs.filter(id_pedido__id_puesto__id_vendedor_id=usuario.pk)
    return qs.none()


def filtrar_pagos(qs: QuerySet[Pago], params: dict[str, Any]) -> QuerySet[Pago]:
    estado = params.get("estado")
    if estado and estado in Pago.Estado.values:
        qs = qs.filter(estado=estado)
    metodo = params.get("metodo_pago")
    if metodo and metodo in Pago.MetodoPago.values:
        qs = qs.filter(metodo_pago=metodo)
    pedido_id = params.get("pedido")
    try:
        if pedido_id:
            qs = qs.filter(id_pedido_id=int(pedido_id))
    except Exception:
        pass
    return qs
