"""Insignia del menú con las verificaciones por revisar (``AccountsConfig.ready``)."""

from apps.accounts.models import Vendedor
from apps.rbac.menu import registrar_insignia


def _verificaciones_pendientes(usuario) -> int:
    return Vendedor.objects.filter(
        estado_verificacion=Vendedor.EstadoVerificacion.PENDIENTE
    ).count()


def registrar() -> None:
    registrar_insignia("admin.verificaciones", _verificaciones_pendientes)
