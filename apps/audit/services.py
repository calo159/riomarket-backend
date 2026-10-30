"""Servicio de auditoría.

``registrar`` es best-effort: cualquier fallo se registra en el log pero nunca
rompe la acción de negocio que lo invoca (igual que las notificaciones).
"""

import logging
from datetime import date, datetime, time, timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import QuerySet
from django.utils import timezone

from apps.audit.models import RegistroAuditoria
from apps.rbac.acceso import tiene_recurso

logger = logging.getLogger(__name__)

ORDENAMIENTO_AUDITORIA = ("fecha_creacion", "-fecha_creacion", "id", "-id")


def _extraer_ip(request) -> str | None:
    if request is None:
        return None
    reenviada = request.META.get("HTTP_X_FORWARDED_FOR")
    if reenviada:
        return reenviada.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def registrar(
    *,
    usuario=None,
    accion: str,
    entidad: str,
    id_entidad: int | None = None,
    detalle: dict | None = None,
    request=None,
) -> RegistroAuditoria | None:
    try:
        return RegistroAuditoria.objects.create(
            id_usuario=usuario if (usuario is not None and usuario.is_authenticated) else None,
            accion=accion,
            entidad=entidad,
            id_entidad=id_entidad,
            detalle=detalle or {},
            direccion_ip=_extraer_ip(request),
        )
    except Exception:  # pragma: no cover - la auditoría nunca rompe el negocio
        logger.exception("No se pudo registrar auditoría: %s %s#%s", accion, entidad, id_entidad)
        return None


def visibles_registros(usuario, qs: QuerySet[RegistroAuditoria]) -> QuerySet[RegistroAuditoria]:
    if not usuario or not usuario.is_authenticated or not tiene_recurso(usuario, "admin.auditoria"):
        return qs.none()
    return qs


def filtrar_registros(qs: QuerySet[RegistroAuditoria], params) -> QuerySet[RegistroAuditoria]:
    entidad = params.get("entidad")
    if entidad:
        qs = qs.filter(entidad=entidad)
    accion = params.get("accion")
    if accion:
        if accion not in RegistroAuditoria.Accion.values:
            raise ValidationError({"accion": f"Acción inválida: {accion}."})
        qs = qs.filter(accion=accion)
    id_usuario = params.get("usuario")
    if id_usuario:
        if not str(id_usuario).isdigit():
            raise ValidationError({"usuario": "Debe ser un ID entero."})
        qs = qs.filter(id_usuario_id=int(id_usuario))
    id_entidad = params.get("id_entidad")
    if id_entidad:
        if not str(id_entidad).isdigit():
            raise ValidationError({"id_entidad": "Debe ser un ID entero."})
        qs = qs.filter(id_entidad=int(id_entidad))
    desde = _inicio_del_dia(params.get("desde"), "desde")
    if desde:
        qs = qs.filter(fecha_creacion__gte=desde)
    hasta = _inicio_del_dia(params.get("hasta"), "hasta")
    if hasta:
        # Rango [inicio, día siguiente): usa el índice de fecha (``__date`` lo anulaba).
        qs = qs.filter(fecha_creacion__lt=hasta + timedelta(days=1))
    return qs


def _inicio_del_dia(valor: str | None, campo: str):
    if not valor:
        return None
    try:
        dia = date.fromisoformat(valor)
    except ValueError as exc:
        raise ValidationError({campo: "Usa el formato AAAA-MM-DD."}) from exc
    return timezone.make_aware(datetime.combine(dia, time.min))


def exigir_admin(usuario) -> None:
    if not (usuario and usuario.is_authenticated and tiene_recurso(usuario, "admin.auditoria")):
        raise PermissionDenied("Solo el administrador consulta la auditoría.")
