"""RBAC formal de los pedidos (Fase 2).

La tabla ``PERMISOS`` declara, por rol, qué acciones puede ejecutar y con qué
relación respecto al pedido. Toda autorización de pedidos pasa por aquí para
que sea verificable aisladamente y no dependa del frontend.

Reglas:
- Anónimo o cuenta suspendida: nunca puede.
- El comprador actúa sobre SU pedido; el vendedor sobre los de SU puesto.
- El administrador puede todo menos crear pedidos (eso es del comprador).
"""

from django.core.exceptions import PermissionDenied
from django.db import models

from apps.accounts.models import Usuario


class Accion(models.TextChoices):
    CREAR = "crear", "Crear"
    EDITAR = "editar", "Editar"
    CONFIRMAR = "confirmar", "Confirmar"
    EN_PREPARACION = "en-preparacion", "Pasar a preparación"
    ENVIAR = "enviar", "Enviar"
    ENTREGAR = "entregar", "Confirmar entrega"
    NO_RECIBIDO = "no-recibido", "Reportar no recibido"
    CANCELAR = "cancelar", "Cancelar"


class Relacion(models.TextChoices):
    COMPRADOR_DEL_PEDIDO = "comprador_del_pedido", "Comprador del pedido"
    VENDEDOR_DEL_PUESTO = "vendedor_del_puesto", "Vendedor del puesto"


PERMISOS: dict[str, dict[str, str | None]] = {
    Usuario.Rol.COMPRADOR: {
        Accion.CREAR: None,
        Accion.EDITAR: Relacion.COMPRADOR_DEL_PEDIDO,
        Accion.ENTREGAR: Relacion.COMPRADOR_DEL_PEDIDO,
        Accion.NO_RECIBIDO: Relacion.COMPRADOR_DEL_PEDIDO,
        Accion.CANCELAR: Relacion.COMPRADOR_DEL_PEDIDO,
    },
    Usuario.Rol.VENDEDOR: {
        Accion.CONFIRMAR: Relacion.VENDEDOR_DEL_PUESTO,
        Accion.EN_PREPARACION: Relacion.VENDEDOR_DEL_PUESTO,
        Accion.ENVIAR: Relacion.VENDEDOR_DEL_PUESTO,
        Accion.CANCELAR: Relacion.VENDEDOR_DEL_PUESTO,
    },
    Usuario.Rol.ADMINISTRADOR: {
        Accion.EDITAR: None,
        Accion.CONFIRMAR: None,
        Accion.EN_PREPARACION: None,
        Accion.ENVIAR: None,
        Accion.ENTREGAR: None,
        Accion.NO_RECIBIDO: None,
        Accion.CANCELAR: None,
    },
}

ACCION_POR_DESTINO: dict[str, str] = {
    "confirmado": Accion.CONFIRMAR,
    "en_preparacion": Accion.EN_PREPARACION,
    "en_camino": Accion.ENVIAR,
    "entregado": Accion.ENTREGAR,
    "cancelado": Accion.CANCELAR,
}


def _relacion_cumplida(usuario, pedido, relacion: str) -> bool:
    if pedido is None:
        return False
    if relacion == Relacion.COMPRADOR_DEL_PEDIDO:
        return pedido.id_comprador_id == usuario.pk
    if relacion == Relacion.VENDEDOR_DEL_PUESTO:
        return pedido.id_puesto_id is not None and pedido.id_puesto.id_vendedor_id == usuario.pk
    return False


def puede(usuario, accion: str, pedido=None) -> bool:
    """``True`` solo si el rol, el estado de la cuenta y la relación lo permiten."""
    if not usuario or not getattr(usuario, "is_authenticated", False):
        return False
    if not getattr(usuario, "is_active", False):
        return False
    reglas = PERMISOS.get(usuario.rol)
    if not reglas or accion not in reglas:
        return False
    relacion = reglas[accion]
    if relacion is None:
        return True
    if (
        usuario.rol == Usuario.Rol.VENDEDOR
        and accion != Accion.CANCELAR
        and not usuario.puede_publicar()
    ):
        # Un vendedor sin verificación aprobada no opera pedidos (sí puede cancelar).
        return False
    return _relacion_cumplida(usuario, pedido, relacion)


def exigir(usuario, accion: str, pedido=None, mensaje: str | None = None) -> None:
    """Lanza ``PermissionDenied`` (403) con un mensaje legible si no puede."""
    if puede(usuario, accion, pedido):
        return
    etiqueta = Accion(accion).label.lower() if accion in Accion.values else accion
    raise PermissionDenied(mensaje or f"No tienes permiso para {etiqueta} este pedido.")
