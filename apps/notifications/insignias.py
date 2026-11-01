"""Insignia del menú con las notificaciones sin leer (``NotificationsConfig.ready``)."""

from apps.notifications.models import Notificacion
from apps.rbac.menu import registrar_insignia


def _sin_leer(usuario) -> int:
    return Notificacion.objects.filter(id_usuario=usuario, leida=False).count()


def registrar() -> None:
    registrar_insignia("notificaciones", _sin_leer)
