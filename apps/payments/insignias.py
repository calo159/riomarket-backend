"""Insignia del menú que cuenta pagos por resolver (se registra en ``PaymentsConfig.ready``)."""

from apps.payments.models import Pago
from apps.rbac.menu import registrar_insignia


def _pagos_por_resolver(usuario) -> int:
    return Pago.objects.filter(estado__in=(Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)).count()


def registrar() -> None:
    registrar_insignia("admin.pagos", _pagos_por_resolver)
