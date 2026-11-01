"""Permisos de DRF de las cuentas.

Por rol (se usan en las vistas de cada módulo):
- EsComprador: solo cuentas con rol comprador (carrito, pedidos, direcciones).
- EsVendedorAprobado: solo vendedores activos y verificados (catálogo).
- EsAdministrador: solo rol administrador (moderación, auditoría).

Y ``RequiereCabeceraCSRFPersonalizada``, la defensa de los endpoints que usan cookie de sesión.
"""

from django.conf import settings
from rest_framework import permissions
from rest_framework.permissions import BasePermission

from apps.accounts.models import Usuario, Vendedor


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


def _es_rol(user, rol: str) -> bool:
    return bool(user and user.is_authenticated and user.rol == rol)


class EsComprador(BasePermission):
    message = "Se requiere una cuenta de comprador activa."

    def has_permission(self, request, view):

        return _es_rol(request.user, Usuario.Rol.COMPRADOR) and request.user.is_active


class EsVendedor(BasePermission):
    """Vendedor con cuenta activa.

    La verificación de cédula (`Vendedor.estado_verificacion`) se exige en
    EsVendedorAprobado, implementado sobre este.
    """

    message = "Se requiere una cuenta de vendedor activa."

    def has_permission(self, request, view):

        return _es_rol(request.user, Usuario.Rol.VENDEDOR) and request.user.is_active


class EsVendedorAprobado(EsVendedor):
    """Vendedor activo cuya identidad fue aprobada por un administrador.

    Mientras el modelo ``Vendedor`` no exista o la cuenta aún no tenga
    solicitud de verificación, se permite pasar (la verificación completa
    llega en el Incremento 2).
    """

    message = "Se requiere un vendedor con identidad verificada."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        vendedor = getattr(request.user, "vendedor", None)
        if vendedor is None:
            return True

        return vendedor.estado_verificacion == Vendedor.EstadoVerificacion.APROBADO


class EsAdministrador(BasePermission):
    message = "Se requiere una cuenta de administrador."

    def has_permission(self, request, view):

        return _es_rol(request.user, Usuario.Rol.ADMINISTRADOR) and request.user.is_active


class EsDuenoOAdmin(BasePermission):
    """Dueño del objeto o administrador (permiso a nivel de objeto).

    Se usa con ``get_object()``: ``has_permission`` deja pasar y la decisión
    real ocurre sobre la instancia.
    """

    message = "Solo el dueño del recurso o un administrador puede acceder."

    # Cadena de dueños: Producto -> Puesto -> Vendedor; Imagen -> Producto ...
    _ATRIBUTOS_DUENO = (
        "usuario",
        "id_usuario",
        "comprador",
        "id_comprador",
        "vendedor",
        "id_vendedor",
        "puesto",
        "id_puesto",
        "producto",
        "id_producto",
        "dueno",
    )
    _PROFUNDIDAD_MAX = 3

    @classmethod
    def _buscar_dueno(cls, obj, profundidad: int = 0):

        if isinstance(obj, Usuario):
            return obj
        if profundidad >= cls._PROFUNDIDAD_MAX:
            return None
        for atributo in cls._ATRIBUTOS_DUENO:
            valor = getattr(obj, atributo, None)
            if isinstance(valor, Usuario):
                return valor
            # Sigue bajando por la cadena de FK (Producto -> Puesto -> Vendedor)
            if valor is not None and hasattr(valor, "_meta"):
                encontrado = cls._buscar_dueno(valor, profundidad + 1)
                if encontrado is not None:
                    return encontrado
        return None

    def has_object_permission(self, request, view, obj):

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.rol == Usuario.Rol.ADMINISTRADOR:
            return True
        dueno = self._buscar_dueno(obj)
        return dueno is not None and dueno.pk == user.pk
