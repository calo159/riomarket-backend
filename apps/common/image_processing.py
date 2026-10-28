"""Procesado de imágenes: sin EXIF, orientación correcta, WebP y miniatura."""

import io
import os

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

MAX_DIM = 1600
THUMB_DIM = 400
WEBP_QUALITY = 80


def _open_image(archivo):
    archivo.seek(0)
    img = Image.open(archivo)
    img.load()
    return img


def process_product_image(archivo) -> tuple[ContentFile, dict]:
    img = _open_image(archivo)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_DIM:
        img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
        w, h = img.size
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
    buf.seek(0)
    content = ContentFile(buf.read())
    content.name = f"{os.path.splitext(getattr(archivo, 'name', 'img'))[0]}.webp"
    return content, {"ancho": w, "alto": h}


def make_thumbnail(archivo) -> ContentFile:
    img = _open_image(archivo)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.thumbnail((THUMB_DIM, THUMB_DIM), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
    buf.seek(0)
    content = ContentFile(buf.read())
    content.name = f"thumb_{os.path.splitext(getattr(archivo, 'name', 'img'))[0]}.webp"
    return content
