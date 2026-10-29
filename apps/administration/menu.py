"""Menú dinámico por rol.

El backend es la autoridad: el frontend pinta lo que recibe y deja de mantener
listas paralelas de enlaces. ``icono`` es la clave de un icono de lucide-react
que el frontend resuelve con su propio registro.
"""

from copy import deepcopy

from apps.accounts.models import Usuario

LINK_CATALOGO = {"to": "/catalogo", "etiqueta": "Catálogo", "icono": "ShoppingBag"}
LINK_PANEL = {"to": "/vendedor", "etiqueta": "Mi panel", "icono": "LayoutDashboard"}
LINK_PERFIL = {"to": "/perfil", "etiqueta": "Mi perfil", "icono": "User"}
LINK_NOTIFICACIONES = {
    "to": "/notificaciones",
    "etiqueta": "Notificaciones",
    "icono": "Bell",
}
LINK_MIS_PEDIDOS = {"to": "/mis-pedidos", "etiqueta": "Mis pedidos", "icono": "Package"}
LINK_DIRECCIONES = {"to": "/direcciones", "etiqueta": "Direcciones", "icono": "MapPin"}

PANEL_VENDEDOR = [
    {"to": "/vendedor", "etiqueta": "Resumen", "icono": "LayoutDashboard", "fin": True},
    {"to": "/vendedor/verificacion", "etiqueta": "Verificación", "icono": "BadgeCheck"},
    {"to": "/vendedor/puestos", "etiqueta": "Mis puestos", "icono": "Store"},
    {"to": "/vendedor/productos", "etiqueta": "Productos", "icono": "Package"},
    {"to": "/vendedor/pedidos", "etiqueta": "Pedidos", "icono": "ClipboardList"},
    {"to": "/vendedor/cupones", "etiqueta": "Cupones", "icono": "Ticket"},
    {"to": "/vendedor/resenas", "etiqueta": "Reseñas", "icono": "Star"},
]

PANEL_ADMIN = [
    {"to": "/admin", "etiqueta": "Resumen", "icono": "LayoutDashboard", "fin": True},
    {"to": "/admin/verificaciones", "etiqueta": "Verificaciones", "icono": "ShieldCheck"},
    {"to": "/admin/usuarios", "etiqueta": "Usuarios", "icono": "Users"},
    {"to": "/admin/pedidos", "etiqueta": "Pedidos", "icono": "ClipboardList"},
    {"to": "/admin/puestos", "etiqueta": "Puestos", "icono": "Store"},
    {"to": "/admin/productos", "etiqueta": "Productos", "icono": "Package"},
    {"to": "/admin/categorias", "etiqueta": "Categorías", "icono": "Tags"},
    {"to": "/admin/resenas", "etiqueta": "Reseñas", "icono": "Star"},
    {"to": "/admin/pagos", "etiqueta": "Pagos", "icono": "CreditCard"},
    {"to": "/admin/cupones", "etiqueta": "Cupones", "icono": "Percent"},
    {"to": "/admin/auditoria", "etiqueta": "Auditoría", "icono": "BookOpenCheck"},
]


def menu_para(usuario: Usuario) -> dict:
    rol = usuario.rol
    if rol == Usuario.Rol.ADMINISTRADOR:
        principal = [LINK_CATALOGO, {**LINK_PANEL, "to": "/admin"}]
        cuenta = [LINK_PERFIL, LINK_NOTIFICACIONES, {**LINK_PANEL, "to": "/admin"}]
        panel = PANEL_ADMIN
        titulo = "Administración"
    elif rol == Usuario.Rol.VENDEDOR:
        principal = [LINK_CATALOGO, LINK_PANEL]
        cuenta = [LINK_PERFIL, LINK_NOTIFICACIONES, LINK_PANEL]
        panel = PANEL_VENDEDOR
        titulo = "Panel de vendedor"
    else:
        principal = [LINK_CATALOGO, LINK_MIS_PEDIDOS]
        cuenta = [LINK_PERFIL, LINK_MIS_PEDIDOS, LINK_DIRECCIONES, LINK_NOTIFICACIONES]
        panel = []
        titulo = None
    return {
        "rol": rol,
        "inicio": "/admin" if rol == Usuario.Rol.ADMINISTRADOR else (
            "/vendedor" if rol == Usuario.Rol.VENDEDOR else "/"
        ),
        "principal": deepcopy(principal),
        "cuenta": deepcopy(cuenta),
        "panel": deepcopy(panel),
        "panel_titulo": titulo,
    }
