"""Permisos por rol de DRF.

Se usan en las vistas por módulo:
- EsComprador: solo cuentas con rol comprador (carrito, pedidos, direcciones).
- EsVendedorAprobado: solo vendedores activos y verificados (catálogo).
- EsAdministrador: solo rol administrador (moderación, auditoría).
"""

from rest_framework.permissions import BasePermission


def _es_rol(user, rol: str) -> bool:
    return bool(user and user.is_authenticated and user.rol == rol)


class EsComprador(BasePermission):
    message = "Se requiere una cuenta de comprador activa."

    def has_permission(self, request, view):
        from apps.accounts.models import Usuario

        return _es_rol(request.user, Usuario.Rol.COMPRADOR) and request.user.is_active


class EsVendedor(BasePermission):
    """Vendedor con cuenta activa.

    La verificación de cédula (`Vendedor.estado_verificacion`) se exige en
    EsVendedorAprobado, implementado sobre este.
    """

    message = "Se requiere una cuenta de vendedor activa."

    def has_permission(self, request, view):
        from apps.accounts.models import Usuario

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
        from apps.accounts.models import Vendedor

        return vendedor.estado_verificacion == Vendedor.EstadoVerificacion.APROBADO


class EsAdministrador(BasePermission):
    message = "Se requiere una cuenta de administrador."

    def has_permission(self, request, view):
        from apps.accounts.models import Usuario

        return _es_rol(request.user, Usuario.Rol.ADMINISTRADOR) and request.user.is_active


class EsDuenoOAdmin(BasePermission):
    """Dueño del objeto o administrador (permiso a nivel de objeto).

    Se usa con ``get_object()``: ``has_permission`` deja pasar y la decisión
    real ocurre sobre la instancia.
    """

    message = "Solo el dueño del recurso o un administrador puede acceder."

    _ATRIBUTOS_DUENO = (
        "usuario",
        "id_usuario",
        "comprador",
        "id_comprador",
        "vendedor",
        "id_vendedor",
    )

    @classmethod
    def _buscar_dueno(cls, obj):
        from apps.accounts.models import Usuario

        if isinstance(obj, Usuario):
            return obj
        for atributo in cls._ATRIBUTOS_DUENO:
            valor = getattr(obj, atributo, None)
            if isinstance(valor, Usuario):
                return valor
        return None

    def has_object_permission(self, request, view, obj):
        from apps.accounts.models import Usuario

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.rol == Usuario.Rol.ADMINISTRADOR:
            return True
        dueno = self._buscar_dueno(obj)
        return dueno is not None and dueno.pk == user.pk
