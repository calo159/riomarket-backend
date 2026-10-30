"""Permiso DRF por recurso: ``permission_classes = [TieneRecurso("admin.usuarios")]``."""

from rest_framework.permissions import BasePermission

from apps.rbac.acceso import recursos_de_usuario


def recursos_de_request(request) -> set[str]:
    """Códigos efectivos del solicitante, cacheados en el request (no en el usuario)."""
    if not hasattr(request, "_recursos_rbac"):
        request._recursos_rbac = recursos_de_usuario(request.user)
    return request._recursos_rbac


def TieneRecurso(codigo: str):
    class _TieneRecurso(BasePermission):
        message = f"Tu cuenta no tiene acceso al recurso «{codigo}»."

        def has_permission(self, request, view):
            return codigo in recursos_de_request(request)

    _TieneRecurso.__name__ = f"TieneRecurso_{codigo}"
    return _TieneRecurso
