"""Reglas de negocio de las notificaciones.

Los servicios de otros módulos (pedidos, pagos, verificación) llaman aquí para
crear avisos. El email es opcional (``NOTIFICATIONS_EMAIL_ENABLED``) y nunca
debe romper la operación principal: se envía con ``fail_silently=True``.
"""

import logging

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.mail import send_mail
from django.db.models import QuerySet
from django.utils import timezone

from apps.common.query import parametro_booleano, parametro_entero
from apps.notifications.models import Notificacion

logger = logging.getLogger(__name__)

ORDENAMIENTO_NOTIFICACION = ("fecha_creacion", "-fecha_creacion", "id", "-id")

# estado del pedido → (tipo, título, mensaje)
_PLANTILLAS = {
    "confirmado": (
        Notificacion.Tipo.PEDIDO_CONFIRMADO,
        "Pedido confirmado",
        "Tu pedido #{pedido} fue confirmado por el vendedor.",
    ),
    "en_preparacion": (
        Notificacion.Tipo.PEDIDO_EN_PREPARACION,
        "Pedido en preparación",
        "El vendedor está preparando tu pedido #{pedido}.",
    ),
    "en_camino": (
        Notificacion.Tipo.PEDIDO_EN_CAMINO,
        "Pedido en camino",
        "Tu pedido #{pedido} va en camino.",
    ),
    "entregado": (
        Notificacion.Tipo.PEDIDO_ENTREGADO,
        "Pedido entregado",
        "Tu pedido #{pedido} fue entregado. ¡Gracias por comprar!",
    ),
    "cancelado": (
        Notificacion.Tipo.PEDIDO_CANCELADO,
        "Pedido cancelado",
        "El pedido #{pedido} fue cancelado.",
    ),
}


def crear_notificacion(*, usuario, tipo: str, titulo: str, mensaje: str, id_pedido=None):
    """Crea y persiste una notificación (valida el tipo)."""
    if tipo not in Notificacion.Tipo.values:
        raise ValidationError({"tipo": f"Tipo de notificación inválido: {tipo}."})
    notificacion = Notificacion(
        id_usuario=usuario,
        id_pedido=id_pedido,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
    )
    notificacion.full_clean()
    notificacion.save()
    return notificacion


def _destinatarios(pedido):
    """Quién recibe el aviso de un cambio de estado del pedido."""
    usuarios = {pedido.id_comprador}
    if pedido.estado == "cancelado":
        usuarios.add(pedido.id_puesto.id_vendedor)
    return list(usuarios)


def notificar_pedido_creado(*, pedido):
    """Avisa al vendedor que entró un pedido nuevo."""
    return [
        crear_notificacion(
            usuario=pedido.id_puesto.id_vendedor,
            tipo=Notificacion.Tipo.PEDIDO_CREADO,
            titulo="Nuevo pedido",
            mensaje=f"Recibiste el pedido #{pedido.pk}.",
            id_pedido=pedido,
        )
    ]


def notificar_cambio_estado_pedido(*, pedido, estado_anterior):
    """Notifica a las partes cuando el pedido cambia de estado.

    ``estado_anterior`` se recibe para trazabilidad/registro; el mensaje se
    arma con el estado actual.
    """
    plantilla = _PLANTILLAS.get(pedido.estado)
    if plantilla is None:
        return []
    tipo, titulo, cuerpo = plantilla
    notificaciones = [
        crear_notificacion(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=cuerpo.format(pedido=pedido.pk),
            id_pedido=pedido,
        )
        for usuario in _destinatarios(pedido)
    ]
    _enviar_emails(notificaciones)
    return notificaciones


def _enviar_emails(notificaciones) -> None:
    if not getattr(settings, "NOTIFICATIONS_EMAIL_ENABLED", False):
        return
    for notificacion in notificaciones:
        try:
            send_mail(
                subject=notificacion.titulo,
                message=notificacion.mensaje,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[notificacion.id_usuario.correo],
                fail_silently=True,
            )
        except Exception:  # pragma: no cover - red/backend nunca debe romper
            logger.exception("No se pudo enviar el email de la notificación %s", notificacion.pk)


# ---------------------------------------------------------------------------
# Consulta y lectura
# ---------------------------------------------------------------------------
def visibles_notificaciones(usuario, qs: QuerySet[Notificacion]) -> QuerySet[Notificacion]:
    if not usuario or not usuario.is_authenticated:
        return qs.none()
    if usuario.es_administrador:
        return qs
    return qs.filter(id_usuario=usuario)


def filtrar_notificaciones(qs: QuerySet[Notificacion], params) -> QuerySet[Notificacion]:
    leida = parametro_booleano(params, "leida")
    if leida is not None:
        qs = qs.filter(leida=leida)
    tipo = params.get("tipo")
    if tipo and tipo in Notificacion.Tipo.values:
        qs = qs.filter(tipo=tipo)
    pedido = parametro_entero(params, "pedido")
    if pedido:
        qs = qs.filter(id_pedido_id=pedido)
    return qs


def _exigir_dueno(notificacion: Notificacion, usuario) -> None:
    if usuario.es_administrador:
        return
    if notificacion.id_usuario_id != usuario.pk:
        raise PermissionDenied("Solo el destinatario puede gestionar la notificación.")


def marcar_leida(*, notificacion: Notificacion, usuario) -> Notificacion:
    _exigir_dueno(notificacion, usuario)
    if not notificacion.leida:
        notificacion.leida = True
        notificacion.fecha_lectura = timezone.now()
        notificacion.save(update_fields=["leida", "fecha_lectura"])
    return notificacion


def marcar_todas_leidas(*, usuario) -> int:
    return Notificacion.objects.filter(id_usuario=usuario, leida=False).update(
        leida=True, fecha_lectura=timezone.now()
    )


def contar_no_leidas(*, usuario) -> int:
    return Notificacion.objects.filter(id_usuario=usuario, leida=False).count()
