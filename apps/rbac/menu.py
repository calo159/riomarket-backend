"""Menú dinámico: sale de los recursos que los roles del usuario le otorgan.

Si el administrador cambia un rol, un recurso o la asignación, el menú cambia
en la siguiente petición. Las insignias (badges) son conteos baratos y solo se
calculan para lo que el usuario ve.

``rbac`` no conoce el dominio: cada app dueña del dato registra el conteo de su
insignia con :func:`registrar_insignia` al arrancar (``AppConfig.ready``). Así la
dependencia va de las apps de negocio hacia ``rbac`` y nunca al revés.
"""

from collections.abc import Callable

from apps.rbac.acceso import nombres_de_roles, recursos_activos_de_usuario

_INSIGNIAS: dict[str, Callable[..., int]] = {}


def registrar_insignia(codigo: str, calculo: Callable[..., int]) -> None:
    """Asocia el recurso ``codigo`` con ``calculo(usuario) -> int`` (idempotente)."""
    _INSIGNIAS[codigo] = calculo


def _badges(usuario, codigos: set[str]) -> dict[str, int]:
    """Conteo por código de recurso; solo de los que el usuario puede ver."""
    return {codigo: calculo(usuario) for codigo, calculo in _INSIGNIAS.items() if codigo in codigos}


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
