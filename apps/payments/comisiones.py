"""Comisión que los vendedores le deben a la plataforma por el efectivo (ADR-019).

El efectivo se cobra en el puesto: el vendedor se queda con todo el dinero y le debe a la
plataforma su comisión. Esta pieza lleva la cuenta:

    pendiente = comisión de los pagos en efectivo aprobados - pagos de comisión ya anotados

Solo cuenta el efectivo. Los demás métodos hoy son de prueba (no hay pasarela real); con una real,
la plataforma recibiría ese dinero y le debería el neto al vendedor, que es otra cuenta.
"""

import contextlib
from decimal import Decimal, InvalidOperation

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Count, F, Max, Sum

from apps.accounts.models import Usuario
from apps.audit import services as audit
from apps.audit.models import RegistroAuditoria
from apps.notifications import services as notificaciones
from apps.notifications.models import Notificacion
from apps.payments.models import LiquidacionComision, Pago
from apps.rbac.acceso import tiene_recurso

CERO = Decimal("0.00")
RECURSO_ADMIN = "admin.pagos"  # el mismo que ya gobierna los pagos del administrador


def _dinero(valor) -> Decimal:
    return (valor or CERO).quantize(Decimal("0.01"))


def _pesos(valor: Decimal) -> str:
    """``$1.500``: pesos colombianos, con punto de miles (no la coma de ``{:,}``)."""
    return "$" + f"{valor:,.0f}".replace(",", ".")


def _es_admin_de_pagos(usuario) -> bool:
    return bool(usuario and usuario.is_active and tiene_recurso(usuario, RECURSO_ADMIN))


def _es_vendedor(usuario) -> bool:
    return bool(usuario and usuario.is_active and usuario.es_vendedor)


def _generada_por_vendedor(vendedor_id=None) -> dict[int, dict]:
    """Comisión y efectivo de los pagos aprobados, por dueño del puesto (1 consulta)."""
    pagos = Pago.objects.filter(estado=Pago.Estado.APROBADO, metodo_pago=Pago.MetodoPago.EFECTIVO)
    if vendedor_id is not None:
        pagos = pagos.filter(id_pedido__id_puesto__id_vendedor_id=vendedor_id)
    filas = (
        pagos.annotate(vendedor=F("id_pedido__id_puesto__id_vendedor_id"))
        .values("vendedor")
        .annotate(
            pagos=Count("pk"),
            cobrado=Sum("total_cobrado"),
            comision=Sum("comision_plataforma"),
        )
        .order_by()
    )
    return {fila["vendedor"]: fila for fila in filas}


def _liquidado_por_vendedor(vendedor_id=None) -> dict[int, dict]:
    liquidaciones = LiquidacionComision.objects.all()
    if vendedor_id is not None:
        liquidaciones = liquidaciones.filter(id_vendedor_id=vendedor_id)
    filas = (
        liquidaciones.values("id_vendedor_id")
        .annotate(total=Sum("monto"), ultima=Max("fecha_creacion"))
        .order_by()
    )
    return {fila["id_vendedor_id"]: fila for fila in filas}


def _cuenta(vendedor_id: int, nombre: str, generada: dict, liquidado: dict) -> dict:
    """Una fila de la cuenta de un vendedor a partir de los dos agregados."""
    movimiento, pagado = generada.get(vendedor_id, {}), liquidado.get(vendedor_id, {})
    comision, total_pagado = _dinero(movimiento.get("comision")), _dinero(pagado.get("total"))
    return {
        "id_vendedor": vendedor_id,
        "vendedor": nombre,
        "pagos_en_efectivo": movimiento.get("pagos", 0),
        "cobrado_en_efectivo": _dinero(movimiento.get("cobrado")),
        "comision_generada": comision,
        "comision_pagada": total_pagado,
        # Negativo = saldo a favor (p. ej. un cobro reembolsado tras haber pagado la comisión).
        "comision_pendiente": comision - total_pagado,
        "ultimo_pago": pagado.get("ultima"),
    }


def resumen(usuario) -> list[dict]:
    """Cuentas de comisión: todas para el administrador; la propia para un vendedor.

    Una fila por vendedor con movimiento (efectivo aprobado o pagos de comisión). 3 consultas fijas.
    """
    if _es_admin_de_pagos(usuario):
        generada, liquidado = _generada_por_vendedor(), _liquidado_por_vendedor()
        ids = set(generada) | set(liquidado)
    elif _es_vendedor(usuario):
        generada, liquidado = (
            _generada_por_vendedor(usuario.pk),
            _liquidado_por_vendedor(usuario.pk),
        )
        ids = {usuario.pk}
    else:
        raise PermissionDenied("Solo vendedores y administradores ven las comisiones.")

    nombres = dict(Usuario.objects.filter(pk__in=ids).values_list("pk", "nombre"))
    filas = [_cuenta(pk, nombres.get(pk, ""), generada, liquidado) for pk in ids]
    # Los que más deben primero; a igualdad, por nombre.
    return sorted(filas, key=lambda fila: (-fila["comision_pendiente"], fila["vendedor"]))


def liquidaciones(usuario, vendedor_id=None):
    """Pagos de comisión anotados: todos para el administrador; los propios para un vendedor."""
    consulta = LiquidacionComision.objects.select_related("id_vendedor", "registrada_por")
    if _es_admin_de_pagos(usuario):
        return consulta.filter(id_vendedor_id=vendedor_id) if vendedor_id else consulta
    if _es_vendedor(usuario):
        return consulta.filter(id_vendedor_id=usuario.pk)
    raise PermissionDenied("Solo vendedores y administradores ven las comisiones.")


def registrar_liquidacion(*, actor, id_vendedor, monto, nota="") -> LiquidacionComision:
    """El administrador anota un pago de comisión recibido de un vendedor.

    No se puede anotar más de lo que el vendedor debe (evita errores de digitación). El vendedor se
    bloquea durante la operación: dos administradores anotando a la vez no pueden pasarse del saldo.
    """
    if not _es_admin_de_pagos(actor):
        raise PermissionDenied("Solo el administrador de pagos anota pagos de comisión.")
    try:
        monto = Decimal(str(monto)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValidationError({"monto": "Escribe un monto válido."}) from exc
    if monto <= 0:
        raise ValidationError({"monto": "El monto debe ser mayor que cero."})
    nota = (nota or "").strip()
    if len(nota) > 200:
        raise ValidationError({"nota": "La nota puede tener hasta 200 caracteres."})

    with transaction.atomic():
        vendedor = Usuario.objects.select_for_update().filter(pk=id_vendedor).first()
        if vendedor is None or not vendedor.es_vendedor:
            raise ValidationError({"id_vendedor": "Ese vendedor no existe."})
        cuenta = _cuenta(
            vendedor.pk,
            vendedor.nombre,
            _generada_por_vendedor(vendedor.pk),
            _liquidado_por_vendedor(vendedor.pk),
        )
        pendiente = cuenta["comision_pendiente"]
        if pendiente <= 0:
            raise ValidationError({"monto": "Ese vendedor no tiene comisión pendiente."})
        if monto > pendiente:
            raise ValidationError(
                {"monto": f"El vendedor debe {_pesos(pendiente)}; no puedes anotar más."}
            )
        liquidacion = LiquidacionComision.objects.create(
            id_vendedor=vendedor, monto=monto, nota=nota, registrada_por=actor
        )

    audit.registrar(
        usuario=actor,
        accion=RegistroAuditoria.Accion.CREAR,
        entidad="liquidacion_comision",
        id_entidad=liquidacion.pk,
        detalle={"vendedor": vendedor.pk, "monto": str(monto), "pendiente_antes": str(pendiente)},
    )
    _avisar(vendedor, monto, pendiente - monto)
    return liquidacion


def _avisar(vendedor, monto: Decimal, queda: Decimal) -> None:
    """Avisa al vendedor que su pago quedó anotado; un aviso fallido nunca deshace el registro."""
    resto = f" Te queda por pagar {_pesos(queda)}." if queda > 0 else " Quedaste al día."
    with contextlib.suppress(ValidationError):
        notificaciones.crear_notificacion(
            usuario=vendedor,
            tipo=Notificacion.Tipo.GENERAL,
            titulo="Anotamos tu pago de comisión",
            mensaje=f"RioMarket anotó tu pago de comisión por {_pesos(monto)}.{resto}",
        )
