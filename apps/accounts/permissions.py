"""Permisos/validaciones para endpoints de autenticación con cookies."""

from django.conf import settings
from rest_framework import permissions


def _mismo_origen(origen: str, permitido: str) -> bool:
    """Compara el origen completo; un prefijo (``riomarket.com.evil.com``) no cuenta."""
    permitido = permitido.rstrip("/")
    return origen == permitido or origen.startswith(permitido + "/")


class RequiereCabeceraCSRFPersonalizada(permissions.BasePermission):
    message = "Cabecera CSRF personalizada requerida."

    def has_permission(self, request, view):
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return True
        if getattr(settings, "AUTH_COOKIE_CSRF_EXEMPT", False):
            return True
        cabecera = request.headers.get("X-Requested-With") or request.META.get(
            "HTTP_X_REQUESTED_WITH"
        )
        if cabecera:
            return True
        origin = request.headers.get("Origin") or request.headers.get("Referer") or ""
        allowed = list(getattr(settings, "CSRF_TRUSTED_ORIGINS", []) or []) + list(
            getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []
        )
        return any(a and _mismo_origen(origin, a.strip()) for a in allowed)
