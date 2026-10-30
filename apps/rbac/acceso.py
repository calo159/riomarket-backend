"""Permisos efectivos de un usuario (sin imports pesados: evita ciclos).

Efectivos = recursos ACTIVOS de los roles ACTIVOS del usuario (asignados en
``usuario_has_rol`` más el rol base por nombre) + los recursos públicos. No hay
atajo por rol base: si el admin le quita un recurso a "administrador", lo
pierde de verdad. Anónimos y cuentas suspendidas solo ven lo público.
"""

from django.db.models import Q

from apps.rbac.models import Recurso, Rol


def _autenticado_activo(usuario) -> bool:
    return bool(
        usuario
        and getattr(usuario, "is_authenticated", False)
        and getattr(usuario, "is_active", False)
    )


def _roles_activos(usuario):
    return Rol.objects.filter(activo=True).filter(
        Q(asignaciones__id_usuario=usuario) | Q(nombre=usuario.rol, es_sistema=True)
    )


def recursos_activos_de_usuario(usuario):
    """Queryset de recursos efectivos (para quien necesite más que el código)."""
    base = Recurso.objects.filter(activo=True)
    if not _autenticado_activo(usuario):
        return base.filter(es_publico=True)
    ids_roles = _roles_activos(usuario).values("id")
    return base.filter(Q(es_publico=True) | Q(vinculos__id_rol__in=ids_roles)).distinct()


def recursos_de_usuario(usuario) -> set[str]:
    return set(recursos_activos_de_usuario(usuario).values_list("codigo", flat=True))


def tiene_recurso(usuario, codigo: str) -> bool:
    return recursos_activos_de_usuario(usuario).filter(codigo=codigo).exists()


def nombres_de_roles(usuario) -> list[str]:
    """Nombres de los roles activos del usuario (base + adicionales)."""
    if not _autenticado_activo(usuario):
        return []
    return sorted(set(_roles_activos(usuario).values_list("nombre", flat=True)))
