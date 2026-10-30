"""Menú dinámico por rol.

El backend es la autoridad: el frontend pinta lo que recibe y deja de mantener
listas paralelas de enlaces. ``icono`` es la clave de un icono de lucide-react
que el frontend resuelve con su propio registro. ``badge`` nombra un contador
del bloque ``badges`` que el frontend muestra junto al enlace.
"""

from copy import deepcopy

from apps.accounts.models import Usuario, Vendedor
from apps.notifications.models import Notificacion
from apps.orders.models import Pedido
from apps.payments.models import Pago

LINK_CATALOGO = {"to": "/catalogo", "etiqueta": "Catálogo", "icono": "ShoppingBag"}
LINK_PANEL = {"to": "/vendedor", "etiqueta": "Mi panel", "icono": "LayoutDashboard"}
LINK_PERFIL = {"to": "/perfil", "etiqueta": "Mi perfil", "icono": "User"}
LINK_NOTIFICACIONES = {
    "to": "/notificaciones",
    "etiqueta": "Notificaciones",
    "icono": "Bell",
    "badge": "notificaciones",
}
LINK_MIS_PEDIDOS = {
    "to": "/mis-pedidos",
    "etiqueta": "Mis pedidos",
    "icono": "Package",
    "badge": "pedidos_por_confirmar",
}
LINK_DIRECCIONES = {"to": "/direcciones", "etiqueta": "Direcciones", "icono": "MapPin"}

PANEL_VENDEDOR = [
    {"to": "/vendedor", "etiqueta": "Resumen", "icono": "LayoutDashboard", "fin": True},
    {"to": "/vendedor/verificacion", "etiqueta": "Verificación", "icono": "BadgeCheck"},
    {"to": "/vendedor/puestos", "etiqueta": "Mis puestos", "icono": "Store"},
    {"to": "/vendedor/productos", "etiqueta": "Productos", "icono": "Package"},
    {
        "to": "/vendedor/pedidos",
        "etiqueta": "Pedidos",
        "icono": "ClipboardList",
        "badge": "pedidos_pendientes",
    },
    {"to": "/vendedor/cupones", "etiqueta": "Cupones", "icono": "Ticket"},
    {"to": "/vendedor/resenas", "etiqueta": "Reseñas", "icono": "Star"},
]

PANEL_ADMIN = [
    {
        "grupo": "General",
        "items": [
            {"to": "/admin", "etiqueta": "Resumen", "icono": "LayoutDashboard", "fin": True},
        ],
    },
    {
        "grupo": "Gestión",
        "items": [
            {"to": "/admin/usuarios", "etiqueta": "Usuarios", "icono": "Users"},
            {
                "to": "/admin/verificaciones",
                "etiqueta": "Verificaciones",
                "icono": "ShieldCheck",
                "badge": "verificaciones",
            },
            {"to": "/admin/puestos", "etiqueta": "Puestos", "icono": "Store"},
            {"to": "/admin/productos", "etiqueta": "Productos", "icono": "Package"},
            {"to": "/admin/categorias", "etiqueta": "Categorías", "icono": "Tags"},
        ],
    },
    {
        "grupo": "Operación",
        "items": [
            {
                "to": "/admin/pedidos",
                "etiqueta": "Pedidos",
                "icono": "ClipboardList",
                "badge": "no_recibidos",
            },
            {
                "to": "/admin/pagos",
                "etiqueta": "Pagos",
                "icono": "CreditCard",
                "badge": "pagos_por_confirmar",
            },
            {"to": "/admin/cupones", "etiqueta": "Cupones", "icono": "Percent"},
            {"to": "/admin/resenas", "etiqueta": "Reseñas", "icono": "Star"},
        ],
    },
    {
        "grupo": "Sistema",
        "items": [
            {"to": "/admin/auditoria", "etiqueta": "Auditoría", "icono": "BookOpenCheck"},
        ],
    },
]


def _badges_comprador(usuario: Usuario) -> dict:
    return {
        "pedidos_por_confirmar": Pedido.objects.filter(
            id_comprador=usuario, estado=Pedido.Estado.EN_CAMINO
        ).count(),
        "notificaciones": Notificacion.objects.filter(id_usuario=usuario, leida=False).count(),
    }


def _badges_vendedor(usuario: Usuario) -> dict:
    return {
        "pedidos_pendientes": Pedido.objects.filter(
            id_puesto__id_vendedor=usuario, estado=Pedido.Estado.PENDIENTE
        ).count(),
        "notificaciones": Notificacion.objects.filter(id_usuario=usuario, leida=False).count(),
    }


def _badges_admin() -> dict:
    return {
        "verificaciones": Vendedor.objects.filter(
            estado_verificacion=Vendedor.EstadoVerificacion.PENDIENTE
        ).count(),
        "no_recibidos": Pedido.objects.filter(no_recibido_en__isnull=False, estado__in=[
            Pedido.Estado.CONFIRMADO,
            Pedido.Estado.EN_PREPARACION,
            Pedido.Estado.EN_CAMINO,
        ]).count(),
        "pagos_por_confirmar": Pago.objects.filter(
            estado__in=(Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
        ).count(),
    }


def menu_para(usuario) -> dict:
    """Devuelve el menú del usuario; anónimo recibe solo el menú público."""
    if not getattr(usuario, "is_authenticated", False):
        return {
            "rol": "anonimo",
            "inicio": "/",
            "publico": deepcopy([LINK_CATALOGO]),
            "cuenta": [],
            "panel": [],
            "panel_titulo": None,
            "badges": {},
        }

    rol = usuario.rol
    if rol == Usuario.Rol.ADMINISTRADOR:
        publico = [LINK_CATALOGO]
        cuenta = [LINK_PERFIL, LINK_NOTIFICACIONES]
        panel = PANEL_ADMIN
        titulo = "Administración"
        inicio = "/admin"
        badges = _badges_admin()
    elif rol == Usuario.Rol.VENDEDOR:
        publico = [LINK_CATALOGO]
        cuenta = [LINK_PERFIL, LINK_NOTIFICACIONES, {**LINK_PANEL, "to": "/vendedor"}]
        panel = [{"grupo": None, "items": PANEL_VENDEDOR}]
        titulo = "Panel de vendedor"
        inicio = "/vendedor"
        badges = _badges_vendedor(usuario)
    else:
        publico = [LINK_CATALOGO, LINK_MIS_PEDIDOS]
        cuenta = [LINK_PERFIL, LINK_DIRECCIONES, LINK_NOTIFICACIONES]
        panel = []
        titulo = None
        inicio = "/"
        badges = _badges_comprador(usuario)

    return {
        "rol": rol,
        "inicio": inicio,
        "publico": deepcopy(publico),
        "cuenta": deepcopy(cuenta),
        "panel": deepcopy(panel),
        "panel_titulo": titulo,
        "badges": badges,
    }
