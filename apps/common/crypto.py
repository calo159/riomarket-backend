"""Cifrado de datos sensibles en reposo (cédula del vendedor).

Dos piezas, ambas necesarias para la regla de negocio 6 (la cédula no puede
repetirse entre cuentas):

1. **Cifrado simétrico (Fernet)** para guardar el dato en reposo.
2. **Huella determinística (HMAC-SHA256)** para poder *comparar* sin
   descifrar: se guarda en un campo con ``unique=True``. Fernet es
   aleatorio (mismo dato → distinto token), por eso no sirve para unicidad.
"""

import hashlib
import hmac

from cryptography.fernet import Fernet, InvalidToken

_fernet: Fernet | None = None


def get_fernet() -> Fernet:
    """Instancia Fernet singleton a partir de ``settings.FERNET_KEY``."""
    global _fernet
    if _fernet is None:
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured

        clave = settings.FERNET_KEY
        if not clave:
            raise ImproperlyConfigured(
                "FERNET_KEY no está definida: no se pueden guardar datos sensibles."
            )
        _fernet = Fernet(clave.encode("ascii"))
    return _fernet


def reiniciar_cache() -> None:
    """Para tests que cambian la clave entre casos."""
    global _fernet
    _fernet = None


def cifrar(texto: str) -> bytes:
    """Cifra un texto y devuelve el token (bytes) para guardar en la BD."""
    if texto is None or texto == "":
        raise ValueError("No se puede cifrar un valor vacío.")
    return get_fernet().encrypt(texto.encode("utf-8"))


def descifrar(token: bytes) -> str:
    """Descifra un token almacenado. Lanza ``InvalidToken`` si la clave cambió."""
    try:
        return get_fernet().decrypt(bytes(token)).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Token inválido: clave Fernet incorrecta o dato alterado.") from exc


def huella_deterministica(texto: str, clave: bytes | None = None) -> str:
    """HMAC-SHA256 del texto ya normalizado → se guarda con ``unique=True``.

    Permite validar unicidad SIN descifrar y SIN exponer el dato.
    """
    if clave is None:
        from django.conf import settings

        clave = hashlib.sha256(settings.FERNET_KEY.encode("ascii")).digest()
    if texto is None or texto == "":
        raise ValueError("No se puede generar la huella de un valor vacío.")
    return hmac.new(clave, texto.encode("utf-8"), hashlib.sha256).hexdigest()


def normalizar_cedula(cedula: str) -> str:
    """Simplifica la cédula para comparar: solo dígitos, sin ceros a la izquierda."""
    digitos = "".join(ch for ch in str(cedula) if ch.isdigit())
    return digitos.lstrip("0") or "0"


def generar_clave_fernet() -> str:
    """Utilidad para generar una clave nueva (``python -m ...`` o docs)."""
    return Fernet.generate_key().decode("ascii")


if __name__ == "__main__":  # pragma: no cover
    print(generar_clave_fernet())
