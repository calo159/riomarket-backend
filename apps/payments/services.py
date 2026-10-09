"""Reglas de negocio de pagos (Fase 4).

Decisiones (ver ``docs/ADR-003-pagos.md``):
- Los montos los calcula el servidor a partir del pedido; el pago usa la MISMA
  fuente (``apps.common.pricing``) para que ``total_cobrado`` siempre cuadre con
  ``Pedido.total``.
- La comisión de plataforma se descuenta al vendedor (``neto_vendedor``).
- Máquina de estados explícita (``TRANSICIONES``) con bloqueo de fila
  (``select_for_update``) y revalidación dentro de la transacción.
- La pasarela sandbox (``simular``/``simulado``) solo opera si
  ``PAYMENTS_SANDBOX_ENABLED`` está activo; en producción se usa el webhook.
"""

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from apps.accounts.models import Usuario
from apps.common import pricing
from apps.common.query import parametro_entero
from apps.orders.models import Pedido
from apps.payments.models import Pago

ORDENAMIENTO_PAGO = ("fecha_creacion", "-fecha_creacion", "id", "-id")

# Máquina de estados: destino -> transiciones permitidas desde él.
TRANSICIONES: dict[str, tuple[str, ...]] = {
    Pago.Estado.PENDIENTE: (
        Pago.Estado.PROCESANDO,
        Pago.Estado.APROBADO,
        Pago.Estado.RECHAZADO,
        Pago.Estado.ANULADO,
    ),
    Pago.Estado.PROCESANDO: (
        Pago.Estado.APROBADO,
        Pago.Estado.RECHAZADO,
        Pago.Estado.ANULADO,
    ),
    Pago.Estado.APROBADO: (Pago.Estado.REEMBOLSADO,),
    Pago.Estado.RECHAZADO: (Pago.Estado.ANULADO,),
    Pago.Estado.REEMBOLSADO: (),
    Pago.Estado.ANULADO: (),
}


def sandbox_habilitado() -> bool:
    return bool(getattr(settings, "PAYMENTS_SANDBOX_ENABLED", False))


# ---------------------------------------------------------------------------
# Creación
# ---------------------------------------------------------------------------
def crear_pago(*, pedido: Pedido, usuario: Usuario, datos: dict) -> Pago:
    """Registra el pago de un pedido pendiente. No lo aprueba."""
    if not usuario or not usuario.is_active:
        raise ValidationError({"no_autorizado": "Usuario no autorizado."})
    if not (usuario.es_administrador or pedido.id_comprador_id == usuario.pk):
        raise PermissionDenied("Solo el comprador o el administrador pueden crear el pago.")
    if hasattr(pedido, "pago"):
        raise ValidationError({"pedido": "El pedido ya tiene un pago registrado."})
    if pedido.estado == Pedido.Estado.CANCELADO:
        raise ValidationError({"id_pedido": "No se puede pagar un pedido cancelado."})
    if pedido.estado == Pedido.Estado.ENTREGADO:
        raise ValidationError({"id_pedido": "El pedido ya fue entregado."})
    if pedido.estado != Pedido.Estado.PENDIENTE:
        raise ValidationError({"id_pedido": "Solo se puede pagar un pedido pendiente."})

    metodo = datos.get("metodo_pago")
    if not metodo:
        metodo = Pago.MetodoPago.SIMULADO if sandbox_habilitado() else Pago.MetodoPago.EFECTIVO
    if metodo not in Pago.MetodoPago.values:
        raise ValidationError({"metodo_pago": f"Método de pago inválido: {metodo}."})
    if metodo == Pago.MetodoPago.SIMULADO and not sandbox_habilitado():
        raise ValidationError(
            {"metodo_pago": "El método 'simulado' solo está disponible en sandbox."}
        )

    # El pedido ya congeló la tarifa (fuente única en crear_pedido): se copia.
    tarifa = pedido.tarifa_domicilio
    comision = pricing.comision_plataforma(pedido.subtotal)
    total = pedido.subtotal + tarifa - pedido.descuento_cupon

    with transaction.atomic():
        pago = Pago(
            id_pedido=pedido,
            metodo_pago=metodo,
            estado=Pago.Estado.PENDIENTE,
            subtotal_pedido=pedido.subtotal,
            tarifa_domicilio_aplicada=tarifa,
            comision_plataforma=comision,
            descuento_aplicado=pedido.descuento_cupon,
            total_cobrado=total,
            notas=(datos.get("notas") or "").strip(),
            datos_sandbox={},
        )
        pago.full_clean()
        pago.save()
    _auditar_pago(usuario, pago, "crear")
    return pago


# ---------------------------------------------------------------------------
# Transiciones (siempre con fila bloqueada)
# ---------------------------------------------------------------------------
def _auditar_pago(usuario, pago: Pago, accion: str) -> None:
    """Registra la acción en la auditoría (best-effort)."""
    if usuario is None:
        return
    from apps.audit import services as audit

    audit.registrar(
        usuario=usuario,
        accion=accion,
        entidad="pago",
        id_entidad=pago.pk,
        detalle={"estado": pago.estado, "pedido": pago.id_pedido_id},
    )


_ACCION_POR_ESTADO = {
    Pago.Estado.APROBADO: "aprobar",
    Pago.Estado.RECHAZADO: "rechazar",
    Pago.Estado.REEMBOLSADO: "reembolsar",
    Pago.Estado.ANULADO: "anular",
}


def _aplicar_estado(
    *,
    pago: Pago,
    destino: str,
    referencia: str = "",
    origen: str = "",
    motivo: str = "",
    usuario: Usuario | None = None,
) -> Pago:
    """Mueve el pago a ``destino`` bloqueando la fila y revalidando el estado."""
    with transaction.atomic():
        bloqueado = Pago.objects.select_for_update().get(pk=pago.pk)
        permitidas = TRANSICIONES[bloqueado.estado]
        if destino not in permitidas:
            raise ValidationError(
                {
                    "estado": (
                        f"Transición de pago inválida: '{bloqueado.estado}' → '{destino}'. "
                        f"Permitidas: {', '.join(permitidas) or 'ninguna'}."
                    )
                }
            )
        bloqueado.estado = destino
        if destino == Pago.Estado.APROBADO:
            bloqueado.fecha_aprobacion = timezone.now()
        elif destino == Pago.Estado.RECHAZADO:
            bloqueado.fecha_aprobacion = None
        elif destino == Pago.Estado.REEMBOLSADO:
            bloqueado.fecha_reembolso = timezone.now()
        if referencia:
            bloqueado.referencia_gateway = referencia
        if origen:
            bloqueado.datos_sandbox = {
                **bloqueado.datos_sandbox,
                "ultimo_evento": {
                    "origen": origen,
                    "accion": destino,
                    "timestamp": timezone.now().isoformat(),
                },
            }
        if motivo:
            bloqueado.notas = (bloqueado.notas + "\n" + motivo).strip()
        bloqueado.full_clean()
        bloqueado.save()
    _auditar_pago(usuario, bloqueado, _ACCION_POR_ESTADO.get(destino, destino))
    return bloqueado


def _autorizar_gestion(pago: Pago, usuario: Usuario) -> None:
    if not (usuario and usuario.is_active):
        raise PermissionDenied("Se requiere una cuenta activa.")
    if usuario.es_administrador:
        return
    if pago.id_pedido.id_comprador_id != usuario.pk:
        raise PermissionDenied(
            "Solo el comprador del pedido o un administrador pueden gestionar el pago."
        )


def simular_pago(*, pago: Pago, usuario: Usuario, datos: dict | None = None) -> Pago:
    """Aprueba o rechaza un pago (solo sandbox). Backdoor cerrado en prod."""
    if not sandbox_habilitado():
        raise PermissionDenied("La simulación de pagos está deshabilitada.")
    _autorizar_gestion(pago, usuario)
    datos = datos or {}
    accion = (datos.get("accion") or "aprobar").strip().lower()
    if accion not in ("aprobar", "rechazar"):
        raise ValidationError({"accion": "Acción inválida: use 'aprobar' o 'rechazar'."})
    referencia = (datos.get("referencia_gateway") or "").strip()
    destino = Pago.Estado.APROBADO if accion == "aprobar" else Pago.Estado.RECHAZADO
    return _aplicar_estado(
        pago=pago,
        destino=destino,
        referencia=referencia or f"sandbox-{accion}",
        origen="simulacion",
        usuario=usuario,
    )


def confirmar_efectivo(*, pago: Pago, usuario: Usuario, datos: dict | None = None) -> Pago:
    """El vendedor del puesto (o admin) confirma que cobró en efectivo."""
    if not (usuario and usuario.is_active):
        raise PermissionDenied("Se requiere una cuenta activa.")
    es_vendedor_puesto = pago.id_pedido.id_puesto.id_vendedor_id == usuario.pk
    if not (usuario.es_administrador or es_vendedor_puesto):
        raise PermissionDenied(
            "Solo el vendedor del puesto o un administrador pueden confirmar el cobro."
        )
    if pago.metodo_pago != Pago.MetodoPago.EFECTIVO:
        raise ValidationError({"metodo_pago": "Este pago no es en efectivo."})
    datos = datos or {}
    return _aplicar_estado(
        pago=pago,
        destino=Pago.Estado.APROBADO,
        referencia="efectivo-cobrado",
        origen="efectivo",
        motivo=(datos.get("notas") or "").strip(),
        usuario=usuario,
    )


def marcar_reembolsado(*, pago: Pago, usuario: Usuario, datos: dict | None = None) -> Pago:
    if not (usuario and usuario.is_active and usuario.es_administrador):
        raise PermissionDenied("Solo el administrador puede marcar un reembolso.")
    datos = datos or {}
    return _aplicar_estado(
        pago=pago,
        destino=Pago.Estado.REEMBOLSADO,
        origen="admin",
        motivo=(datos.get("notas") or "").strip(),
        usuario=usuario,
    )


def anular_pago(*, pago: Pago, usuario: Usuario, datos: dict | None = None) -> Pago:
    if not (usuario and usuario.is_active and usuario.es_administrador):
        raise PermissionDenied("Solo el administrador puede anular un pago.")
    datos = datos or {}
    return _aplicar_estado(
        pago=pago,
        destino=Pago.Estado.ANULADO,
        origen="admin",
        motivo=(datos.get("notas") or "").strip(),
        usuario=usuario,
    )


def reembolsar_o_anular_por_cancelacion(*, pedido: Pedido) -> Pago | None:
    """Al cancelar un pedido: reembolsa el pago aprobado o anula el vigente."""
    pago = Pago.objects.filter(id_pedido=pedido).first()
    if pago is None:
        return None
    if pago.estado == Pago.Estado.APROBADO:
        return _aplicar_estado(
            pago=pago, destino=Pago.Estado.REEMBOLSADO, origen="cancelacion_pedido"
        )
    if pago.estado in (Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO):
        return _aplicar_estado(pago=pago, destino=Pago.Estado.ANULADO, origen="cancelacion_pedido")
    return pago


# ---------------------------------------------------------------------------
# Webhook de pasarela real
# ---------------------------------------------------------------------------
def _buscar_pago_por_referencia(referencia: str) -> Pago | None:
    pago = Pago.objects.filter(referencia_gateway=referencia).first()
    if pago is not None:
        return pago
    # Convención sandbox: ``sandbox-<pk>``.
    if referencia.startswith("sandbox-"):
        pk_texto = referencia.removeprefix("sandbox-")
        if pk_texto.isdigit():
            return Pago.objects.filter(pk=int(pk_texto)).first()
    return None


def procesar_webhook(*, proveedor: str, cuerpo: bytes, payload: dict, firma: str) -> Pago:
    """Valida la firma del webhook y aplica el evento al pago correspondiente."""
    from apps.payments.pasarela import get_pasarela

    try:
        pasarela = get_pasarela(proveedor)
    except ValueError as exc:
        raise ValidationError({"proveedor": str(exc)}) from exc
    if not pasarela.verificar_firma(payload=cuerpo, firma=firma):
        raise PermissionDenied("Firma de webhook inválida.")
    try:
        evento = pasarela.interpretar_evento(payload=payload)
    except ValueError as exc:
        raise ValidationError({"payload": str(exc)}) from exc

    pago = _buscar_pago_por_referencia(evento["referencia"])
    if pago is None:
        raise ValidationError({"referencia": "No existe un pago con esa referencia."})
    destino = Pago.Estado.APROBADO if evento["estado"] == "aprobado" else Pago.Estado.RECHAZADO
    return _aplicar_estado(
        pago=pago,
        destino=destino,
        referencia=evento["referencia"],
        origen=f"webhook:{proveedor}",
    )


# ---------------------------------------------------------------------------
# Visibilidad / filtros / orden
# ---------------------------------------------------------------------------
def visibles_pagos(usuario: Usuario, qs: QuerySet[Pago], params: dict) -> QuerySet[Pago]:
    if not usuario or not usuario.is_authenticated:
        return qs.none()
    if usuario.es_administrador:
        return qs
    if usuario.es_vendedor:
        return qs.filter(id_pedido__id_puesto__id_vendedor_id=usuario.pk)
    return qs.filter(id_pedido__id_comprador_id=usuario.pk)


def filtrar_pagos(qs: QuerySet[Pago], params: dict) -> QuerySet[Pago]:
    estado = params.get("estado")
    if estado and estado in Pago.Estado.values:
        qs = qs.filter(estado=estado)
    metodo = params.get("metodo_pago")
    if metodo and metodo in Pago.MetodoPago.values:
        qs = qs.filter(metodo_pago=metodo)
    pedido_id = parametro_entero(params, "pedido")
    if pedido_id:
        qs = qs.filter(id_pedido_id=pedido_id)
    return qs
