"""Menú dinámico: sale de los recursos que los roles del usuario le otorgan.

Si el administrador cambia un rol, un recurso o la asignación, el menú cambia
en la siguiente petición. Los badges son conteos baratos y solo se calculan
para lo que el usuario ve.
"""

from apps.accounts.models import Vendedor
from apps.notifications.models import Notificacion
from apps.orders.models import Pedido
from apps.payments.models import Pago
from apps.rbac.acceso import nombres_de_roles, recursos_activos_de_usuario


def _badges(usuario, codigos: set[str]) -> dict[str, int]:
    """Conteo por código de recurso; solo de los que el usuario puede ver."""
    badges: dict[str, int] = {}
    if "mis_pedidos" in codigos:
        badges["mis_pedidos"] = Pedido.objects.filter(
            id_comprador=usuario, estado=Pedido.Estado.EN_CAMINO
        ).count()
    if "notificaciones" in codigos:
        badges["notificaciones"] = Notificacion.objects.filter(
            id_usuario=usuario, leida=False
        ).count()
    if "vendedor.pedidos" in codigos:
        badges["vendedor.pedidos"] = Pedido.objects.filter(
            id_puesto__id_vendedor=usuario, estado=Pedido.Estado.PENDIENTE
        ).count()
    if "admin.verificaciones" in codigos:
        badges["admin.verificaciones"] = Vendedor.objects.filter(
            estado_verificacion=Vendedor.EstadoVerificacion.PENDIENTE
        ).count()
    if "admin.pedidos" in codigos:
        # Reportados como "no recibido" y todavía sin resolver (no finales).
        badges["admin.pedidos"] = (
            Pedido.objects.filter(no_recibido_en__isnull=False)
            .exclude(estado__in=Pedido.ESTADOS_FINALES)
            .count()
        )
    if "admin.pagos" in codigos:
        badges["admin.pagos"] = Pago.objects.filter(
            estado__in=(Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
        ).count()
    return badges


def menu_para(usuario) -> dict:
    autenticado = bool(getattr(usuario, "is_authenticated", False))
    recursos = list(recursos_activos_de_usuario(usuario).order_by("ambito", "grupo", "orden", "id"))
    codigos = {r.codigo for r in recursos}
    items = [
        {
            "codigo": r.codigo,
            "nombre": r.nombre,
            "ruta": r.ruta,
            "icono": r.icono,
            "ambito": r.ambito,
            "grupo": r.grupo,
            "orden": r.orden,
        }
        for r in recursos
        if r.ruta
    ]
    activo = autenticado and usuario.is_active
    return {
        "rol": usuario.rol if autenticado else "anonimo",
        "roles": nombres_de_roles(usuario),
        "recursos": sorted(codigos),
        "items": items,
        "badges": _badges(usuario, codigos) if activo else {},
    }
