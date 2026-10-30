"""Catálogo por defecto de roles y recursos y su siembra idempotente.

``sembrar`` recibe las clases de modelo para poder usarse con los modelos
históricos de una migración de datos. Solo AGREGA lo que falta: no pisa lo
que el administrador editó ni re-vincula recursos que él quitó (los vínculos
por defecto se crean únicamente cuando el recurso se crea).
"""

COMPRADOR = "comprador"
VENDEDOR = "vendedor"
ADMINISTRADOR = "administrador"
ROLES_BASE = (COMPRADOR, VENDEDOR, ADMINISTRADOR)

DESCRIPCION_ROL = {
    COMPRADOR: "Compra en el catálogo y gestiona sus pedidos.",
    VENDEDOR: "Administra sus puestos, productos y pedidos.",
    ADMINISTRADOR: "Administra usuarios, accesos y la plataforma.",
}

# Recursos que el rol administrador no puede perder (candado anti-bloqueo).
RECURSOS_OBLIGATORIOS_ADMIN = ("admin.usuarios", "admin.roles", "admin.recursos", "admin.resumen")

_TODOS = (COMPRADOR, VENDEDOR, ADMINISTRADOR)
_PV, _PA = "panel_vendedor", "panel_admin"


def _r(codigo, nombre, ambito, ruta, icono, roles=(), grupo="", orden=0, publico=False):
    return {
        "codigo": codigo,
        "nombre": nombre,
        "ambito": ambito,
        "ruta": ruta,
        "icono": icono,
        "grupo": grupo,
        "orden": orden,
        "es_publico": publico,
        "roles": roles,
    }


RECURSOS_POR_DEFECTO = [
    _r("catalogo", "Catálogo", "publico", "/catalogo", "ShoppingBag", publico=True),
    _r("mis_pedidos", "Mis pedidos", "cuenta", "/mis-pedidos", "Package", (COMPRADOR,), orden=1),
    _r("direcciones", "Direcciones", "cuenta", "/direcciones", "MapPin", (COMPRADOR,), orden=2),
    _r("notificaciones", "Notificaciones", "cuenta", "/notificaciones", "Bell", _TODOS, orden=3),
    _r("perfil", "Mi perfil", "cuenta", "/perfil", "User", _TODOS, orden=4),
    _r("vendedor.resumen", "Resumen", _PV, "/vendedor", "LayoutDashboard", (VENDEDOR,), orden=1),
    _r(
        "vendedor.verificacion",
        "Verificación",
        _PV,
        "/vendedor/verificacion",
        "BadgeCheck",
        (VENDEDOR,),
        orden=2,
    ),
    _r("vendedor.puestos", "Mis puestos", _PV, "/vendedor/puestos", "Store", (VENDEDOR,), orden=3),
    _r(
        "vendedor.productos",
        "Productos",
        _PV,
        "/vendedor/productos",
        "Package",
        (VENDEDOR,),
        orden=4,
    ),
    _r(
        "vendedor.pedidos",
        "Pedidos",
        _PV,
        "/vendedor/pedidos",
        "ClipboardList",
        (VENDEDOR,),
        orden=5,
    ),
    _r("vendedor.cupones", "Cupones", _PV, "/vendedor/cupones", "Ticket", (VENDEDOR,), orden=6),
    _r("vendedor.resenas", "Reseñas", _PV, "/vendedor/resenas", "Star", (VENDEDOR,), orden=7),
    _r("admin.resumen", "Resumen", _PA, "/admin", "LayoutDashboard", (ADMINISTRADOR,), orden=1),
    _r(
        "admin.usuarios",
        "Usuarios",
        _PA,
        "/admin/usuarios",
        "Users",
        (ADMINISTRADOR,),
        "Accesos",
        1,
    ),
    _r("admin.roles", "Roles", _PA, "/admin/roles", "KeyRound", (ADMINISTRADOR,), "Accesos", 2),
    _r(
        "admin.recursos",
        "Recursos",
        _PA,
        "/admin/recursos",
        "LayoutList",
        (ADMINISTRADOR,),
        "Accesos",
        3,
    ),
    _r(
        "admin.verificaciones",
        "Verificaciones",
        _PA,
        "/admin/verificaciones",
        "ShieldCheck",
        (ADMINISTRADOR,),
        "Gestión",
        1,
    ),
    _r("admin.puestos", "Puestos", _PA, "/admin/puestos", "Store", (ADMINISTRADOR,), "Gestión", 2),
    _r(
        "admin.productos",
        "Productos",
        _PA,
        "/admin/productos",
        "Package",
        (ADMINISTRADOR,),
        "Gestión",
        3,
    ),
    _r(
        "admin.categorias",
        "Categorías",
        _PA,
        "/admin/categorias",
        "Tags",
        (ADMINISTRADOR,),
        "Gestión",
        4,
    ),
    _r(
        "admin.pedidos",
        "Pedidos",
        _PA,
        "/admin/pedidos",
        "ClipboardList",
        (ADMINISTRADOR,),
        "Operación",
        1,
    ),
    _r("admin.pagos", "Pagos", _PA, "/admin/pagos", "CreditCard", (ADMINISTRADOR,), "Operación", 2),
    _r(
        "admin.cupones",
        "Cupones",
        _PA,
        "/admin/cupones",
        "Percent",
        (ADMINISTRADOR,),
        "Operación",
        3,
    ),
    _r("admin.resenas", "Reseñas", _PA, "/admin/resenas", "Star", (ADMINISTRADOR,), "Operación", 4),
    _r(
        "admin.auditoria",
        "Auditoría",
        _PA,
        "/admin/auditoria",
        "BookOpenCheck",
        (ADMINISTRADOR,),
        "Sistema",
        1,
    ),
]


def sembrar(Rol, Recurso, RolRecurso):
    """Crea los roles base y los recursos que falten. Devuelve cuántos recursos creó."""
    roles = {}
    for nombre in ROLES_BASE:
        roles[nombre], _ = Rol.objects.get_or_create(
            nombre=nombre,
            defaults={"descripcion": DESCRIPCION_ROL[nombre], "es_sistema": True},
        )
    creados = 0
    for datos in RECURSOS_POR_DEFECTO:
        campos = {k: v for k, v in datos.items() if k not in ("codigo", "roles")}
        recurso, nuevo = Recurso.objects.get_or_create(
            codigo=datos["codigo"], defaults={**campos, "es_sistema": True}
        )
        if nuevo:
            creados += 1
            for nombre in datos["roles"]:
                RolRecurso.objects.get_or_create(id_rol=roles[nombre], id_recurso=recurso)
    return creados
