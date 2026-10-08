"""Validación estricta de archivos subidos (foto de cédula, imágenes).

Reglas:
- Tipo MIME permitido (jpeg/png/webp), verificado con Pillow, no solo la
  extensión del nombre.
- Tamaño máximo configurable por entorno (``MAX_IMAGE_SIZE``).
- Nombre saneado: se reescribe como UUID + extensión canónica al guardar.
"""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

EXTENSIONES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def validate_image_file(archivo):
    """Valida un ``UploadedFile``. Lanza ``ValidationError`` si no cumple."""
    if archivo is None:
        return

    contenido_tipo = getattr(archivo, "content_type", "")
    if contenido_tipo not in settings.ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError(
            f"Tipo de archivo no permitido: {contenido_tipo or 'desconocido'}. "
            f"Use uno de: {', '.join(settings.ALLOWED_IMAGE_CONTENT_TYPES)}."
        )

    if archivo.size > settings.MAX_IMAGE_SIZE:
        mb = settings.MAX_IMAGE_SIZE / (1024 * 1024)
        raise ValidationError(f"La imagen supera el tamaño máximo de {mb:.1f} MB.")

    archivo.seek(0)
    try:
        with Image.open(archivo) as img:
            img.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError("El archivo no es una imagen válida.", code="invalid_image") from exc
    finally:
        archivo.seek(0)


def renombrar_archivo(archivo, prefijo: str = "img") -> str:
    """Sanea el nombre: devuelve ``<prefijo>_<uuid><ext>`` (sin rutas)."""
    extension = EXTENSIONES.get(getattr(archivo, "content_type", ""), ".bin")
    return f"{prefijo}_{uuid.uuid4().hex}{extension}"
