"""Servicio de auditoría.

``registrar`` es best-effort: cualquier fallo se registra en el log pero nunca
rompe la acción de negocio que lo invoca (igual que las notificaciones).
"""

import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import QuerySet

from apps.audit.models import RegistroAuditoria

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
    if not usuario or not usuario.is_authenticated or not usuario.es_administrador:
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
    desde = params.get("desde")
    if desde:
        qs = qs.filter(fecha_creacion__date__gte=desde)
    hasta = params.get("hasta")
    if hasta:
        qs = qs.filter(fecha_creacion__date__lte=hasta)
    return qs


def exigir_admin(usuario) -> None:
    if not (usuario and usuario.is_authenticated and usuario.es_administrador):
        raise PermissionDenied("Solo el administrador consulta la auditoría.")
