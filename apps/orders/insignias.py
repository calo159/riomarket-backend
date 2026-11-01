"""Insignias del menú que cuentan pedidos (se registran en ``OrdersConfig.ready``)."""

from apps.orders.models import Pedido
from apps.rbac.menu import registrar_insignia


def _mis_pedidos(usuario) -> int:
    return Pedido.objects.filter(
        id_comprador=usuario,
        estado__in=(Pedido.Estado.EN_CAMINO, Pedido.Estado.LISTO_PARA_RECOGER),
    ).count()


def _pedidos_del_vendedor(usuario) -> int:
    return Pedido.objects.filter(
        id_puesto__id_vendedor=usuario, estado=Pedido.Estado.PENDIENTE
    ).count()


def _pedidos_no_recibidos(usuario) -> int:
    # Reportados como "no recibido" y todavía sin resolver (no finales).
    return (
        Pedido.objects.filter(no_recibido_en__isnull=False)
        .exclude(estado__in=Pedido.ESTADOS_FINALES)
        .count()
    )


def registrar() -> None:
    registrar_insignia("mis_pedidos", _mis_pedidos)
    registrar_insignia("vendedor.pedidos", _pedidos_del_vendedor)
    registrar_insignia("admin.pedidos", _pedidos_no_recibidos)
