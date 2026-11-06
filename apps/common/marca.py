"""Punto único de lectura de la identidad del sitio (nombre de la marca, ciudad, contacto…).

Antes «RioMarket» y «Riohacha» estaban escritos en el código de los correos, los avisos y los
títulos. Ahora el administrador los cambia desde el panel y todo lo que habla en nombre de la marca
pasa por aquí. ``common`` es el nivel 0 y no puede leer la tabla donde se guardan, así que esta capa
solo define el gancho: la app ``configuracion`` registra su proveedor al arrancar
(``AppConfig.ready``), igual que ``ajustes`` (ADR-022).
"""

from collections.abc import Callable

_proveedor: Callable[[str, str], str] | None = None

NOMBRE_POR_DEFECTO = "RioMarket"


def registrar_proveedor(proveedor: Callable[[str, str], str] | None) -> None:
    global _proveedor
    _proveedor = proveedor


def dato(clave: str, defecto: str = "") -> str:
    """Un dato de la identidad del sitio por su clave (``nombre_marca``, ``ciudad``…)."""
    if _proveedor is None:
        return defecto
    return _proveedor(clave, defecto) or defecto


def nombre() -> str:
    return dato("nombre_marca", NOMBRE_POR_DEFECTO)


def ciudad() -> str:
    return dato("ciudad", "Riohacha")
