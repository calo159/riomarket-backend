"""RBAC de pedidos: qué rol puede ejecutar qué acción y sobre qué pedidos.

Una sola tabla (``PERMISOS``) responde dos preguntas:

1. ¿Tiene el ROL permiso para la acción?  (comprador, vendedor, administrador)
2. ¿Con qué RELACIÓN con el pedido? Tener el rol no basta: el comprador solo
   actúa sobre SUS pedidos y el vendedor solo sobre los de SU puesto.

Cambiar quién puede hacer qué es editar esta tabla; ``services`` y la API
(``acciones_permitidas``) leen de aquí, así backend y frontend no se
contradicen. El estado del pedido (qué transición es válida ahora) se valida
aparte, en la máquina de estados de ``services``.
"""

from django.core.exceptions import PermissionDenied
from django.db import models

from apps.accounts.models import Usuario


class Accion(models.TextChoices):
    """Acciones sobre un pedido. El valor coincide con la ruta del endpoint."""

    CREAR = "crear", "Crear pedido"
    EDITAR = "editar", "Editar dirección/notas"
    CONFIRMAR = "confirmar", "Confirmar pedido"
    EN_PREPARACION = "en-preparacion", "Pasar a preparación"
    ENVIAR = "enviar", "Marcar en camino / listo para retirar"
    ENTREGAR = "entregar", "Confirmar que se recibió"
    NO_RECIBIDO = "no-recibido", "Reportar que no llegó"
    CANCELAR = "cancelar", "Cancelar pedido"


class Relacion(models.TextChoices):
    """Vínculo exigido entre el usuario y el pedido concreto."""

    COMPRADOR_DEL_PEDIDO = "comprador_del_pedido", "Comprador del pedido"
    VENDEDOR_DEL_PUESTO = "vendedor_del_puesto", "Vendedor dueño del puesto"


_C = Relacion.COMPRADOR_DEL_PEDIDO
_V = Relacion.VENDEDOR_DEL_PUESTO

# rol -> {acción: relación exigida (None = sin relación, aplica a cualquier pedido)}
PERMISOS: dict[str, dict[str, Relacion | None]] = {
    Usuario.Rol.COMPRADOR: {
        Accion.CREAR: None,  # crea pedidos propios: no hay pedido previo
        Accion.EDITAR: _C,
        Accion.ENTREGAR: _C,  # solo quien recibe confirma la recepción
        Accion.NO_RECIBIDO: _C,
        Accion.CANCELAR: _C,
    },
    Usuario.Rol.VENDEDOR: {
        Accion.CONFIRMAR: _V,
        Accion.EN_PREPARACION: _V,
        Accion.ENVIAR: _V,  # "ya se lo entregué al domiciliario / está listo"
        Accion.CANCELAR: _V,
    },
    # El administrador modera y resuelve disputas, pero no crea pedidos.
    Usuario.Rol.ADMINISTRADOR: {accion: None for accion in Accion if accion != Accion.CREAR},
}

_MENSAJES_DENEGADO: dict[str, str] = {
    Accion.EDITAR: "Solo el comprador puede editar su pedido.",
    Accion.CONFIRMAR: "Solo el vendedor del puesto puede realizar esta acción.",
    Accion.EN_PREPARACION: "Solo el vendedor del puesto puede realizar esta acción.",
    Accion.ENVIAR: "Solo el vendedor del puesto puede realizar esta acción.",
    Accion.ENTREGAR: "Solo el comprador del pedido puede confirmar que lo recibió.",
    Accion.NO_RECIBIDO: "Solo el comprador del pedido puede realizar esta acción.",
    Accion.CANCELAR: "Solo las partes del pedido pueden realizar esta acción.",
}


def _cumple_relacion(usuario, relacion: Relacion, pedido) -> bool:
    if pedido is None:
        return False
    if relacion == Relacion.COMPRADOR_DEL_PEDIDO:
        return pedido.id_comprador_id == usuario.pk
    return pedido.id_puesto.id_vendedor_id == usuario.pk


def puede(usuario, accion: str, pedido=None) -> bool:
    """¿Puede ``usuario`` ejecutar ``accion`` (sobre ``pedido``, si aplica)?"""
    if not (usuario and getattr(usuario, "is_authenticated", False) and usuario.is_active):
        return False
    permisos_del_rol = PERMISOS.get(usuario.rol, {})
    if accion not in permisos_del_rol:
        return False
    relacion = permisos_del_rol[accion]
    return relacion is None or _cumple_relacion(usuario, relacion, pedido)


def exigir(usuario, accion: str, pedido=None) -> None:
    """Lanza ``PermissionDenied`` (→ 403) si el usuario no puede la acción."""
    if not (usuario and getattr(usuario, "is_authenticated", False) and usuario.is_active):
        raise PermissionDenied("Se requiere una cuenta activa.")
    if not puede(usuario, accion, pedido):
        raise PermissionDenied(
            _MENSAJES_DENEGADO.get(accion, "No tienes permiso para realizar esta acción.")
        )
