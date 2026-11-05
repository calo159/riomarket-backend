"""Punto único de lectura de los ajustes que el administrador puede cambiar desde el panel.

Antes, la comisión, la tarifa de domicilio y los límites de atraso se leían de ``settings``
(variables de entorno de Render) y cambiarlos exigía entrar a Render y reiniciar. Ahora cada lectura
pasa por ``valor``: si el administrador fijó un valor en el panel gana ese; si no, vale el de
``settings``.

``common`` es el nivel 0 y no puede importar la tabla donde se guardan los valores, así que esta
capa solo define el gancho: la app ``configuracion`` registra su proveedor al arrancar
(``AppConfig.ready``), igual que el menú registra sus insignias (ADR-017).
"""

from collections.abc import Callable
from typing import Any

from django.conf import settings

# ``proveedor(nombre_del_ajuste)`` devuelve el valor fijado en el panel o ``None`` si no hay.
_proveedor: Callable[[str], Any] | None = None


def registrar_proveedor(proveedor: Callable[[str], Any] | None) -> None:
    global _proveedor
    _proveedor = proveedor


def valor(nombre: str, default: Any = None) -> Any:
    """Valor vigente del ajuste ``nombre``: el del panel si existe, si no el de ``settings``."""
    if _proveedor is not None:
        fijado = _proveedor(nombre)
        if fijado is not None:
            return fijado
    return getattr(settings, nombre, default)
