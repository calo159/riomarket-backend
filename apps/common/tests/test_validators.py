"""Pruebas de la validación estricta de archivos subidos."""

import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.common.validators import renombrar_archivo, validate_image_file


def _png_bytes(tamano=(8, 8)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", tamano, "red").save(buffer, format="PNG")
    return buffer.getvalue()


def _archivo(nombre="foto.png", contenido=None, content_type="image/png"):
    return SimpleUploadedFile(
        nombre, contenido if contenido is not None else _png_bytes(), content_type=content_type
    )


def test_imagen_valida_no_lanza_error():
    validate_image_file(_archivo())  # no debe lanzar


def test_acepta_jpeg_y_webp():
    validate_image_file(_archivo(nombre="foto.jpg", content_type="image/jpeg"))
    validate_image_file(_archivo(nombre="foto.webp", content_type="image/webp"))


def test_rechaza_tipo_mime_no_permitido():
    with pytest.raises(ValidationError, match="Tipo de archivo no permitido"):
        validate_image_file(
            _archivo(nombre="doc.pdf", contenido=b"%PDF-1.4", content_type="application/pdf")
        )


def test_rechaza_archivo_falso_con_extension_de_imagen():
    """MIME declarado image/png pero el contenido no es una imagen."""
    archivo = _archivo(
        nombre="malicioso.png", contenido=b"no soy una imagen", content_type="image/png"
    )
    with pytest.raises(ValidationError, match="no es una imagen"):
        validate_image_file(archivo)


def test_rechaza_archivo_sobre_tamano_maximo(settings):
    settings.MAX_IMAGE_SIZE = 1024
    with pytest.raises(ValidationError, match="tama"):
        validate_image_file(_archivo(contenido=b"x" * 2048))


def test_none_no_lanza():
    assert validate_image_file(None) is None


def test_renombrar_archivo_sanea_nombre():
    nombre = renombrar_archivo(_archivo(nombre="../../etc/passwd.png"))
    assert "/" not in nombre and ".." not in nombre
    assert nombre.startswith("img_") and nombre.endswith(".png")


def test_renombrar_archivo_con_prefijo():
    assert renombrar_archivo(_archivo(), prefijo="cedula").startswith("cedula_")
