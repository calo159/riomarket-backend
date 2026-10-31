"""``generar_miniaturas`` completa miniatura y medidas sin tocar lo que ya está bien."""

from io import BytesIO

import pytest
from django.core.files.base import ContentFile
from django.core.management import call_command
from PIL import Image

from apps.catalog.models import ImagenProducto
from tests.factories import ProductoFactory

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media_temporal(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def _foto(lado=640, formato="WEBP") -> bytes:
    salida = BytesIO()
    Image.new("RGB", (lado, lado), "green").save(salida, formato)
    return salida.getvalue()


def _sin_miniatura(nombre="foto-demo-x.webp", **extra) -> ImagenProducto:
    return ImagenProducto.objects.create(
        id_producto=ProductoFactory(), archivo=ContentFile(_foto(), name=nombre), **extra
    )


def _correr(capsys, *args) -> str:
    call_command("generar_miniaturas", *args)
    return capsys.readouterr().out


def test_genera_miniatura_y_medidas(capsys):
    imagen = _sin_miniatura()
    original = imagen.archivo.read()

    salida = _correr(capsys)

    imagen.refresh_from_db()
    assert "Miniaturas generadas: 1" in salida
    assert (imagen.ancho, imagen.alto) == (640, 640)
    with Image.open(imagen.miniatura) as mini:
        assert mini.size == (400, 400)
    # La miniatura vive en su carpeta y el original no se toca.
    assert imagen.miniatura.name.startswith("productos/mini/")
    assert imagen.archivo.read() == original


def test_es_idempotente(capsys):
    imagen = _sin_miniatura()
    _correr(capsys)
    imagen.refresh_from_db()
    miniatura = imagen.miniatura.name

    salida = _correr(capsys)

    imagen.refresh_from_db()
    assert "Miniaturas generadas: 0" in salida
    assert imagen.miniatura.name == miniatura


def test_dry_run_no_guarda_nada(capsys):
    imagen = _sin_miniatura()

    salida = _correr(capsys, "--dry-run")

    imagen.refresh_from_db()
    assert "Se generarían: Miniaturas generadas: 1" in salida
    assert not imagen.miniatura
    assert imagen.ancho is None


def test_completa_las_medidas_si_ya_tiene_miniatura(capsys):
    imagen = _sin_miniatura()
    imagen.miniatura.save("m.webp", ContentFile(_foto(400)), save=False)
    imagen.save()
    miniatura = imagen.miniatura.name
    assert imagen.ancho is None

    _correr(capsys)

    imagen.refresh_from_db()
    assert (imagen.ancho, imagen.alto) == (640, 640)
    assert imagen.miniatura.name == miniatura


def test_salta_la_imagen_cuyo_archivo_desaparecio(capsys):
    perdida = _sin_miniatura("perdida.webp")
    perdida.archivo.storage.delete(perdida.archivo.name)
    buena = _sin_miniatura("buena.webp")

    salida = _correr(capsys)

    buena.refresh_from_db()
    perdida.refresh_from_db()
    assert "Miniaturas generadas: 1" in salida
    assert "sin archivo (omitidas): 1" in salida
    assert buena.miniatura
    assert not perdida.miniatura


def test_respeta_el_limite(capsys):
    for _ in range(3):
        _sin_miniatura()

    salida = _correr(capsys, "--limite", "2")

    assert "Miniaturas generadas: 2" in salida
    assert ImagenProducto.objects.filter(miniatura="").count() == 1


def test_no_toca_las_imagenes_completas(capsys):
    imagen = _sin_miniatura(ancho=640, alto=640)
    imagen.miniatura.save("m.webp", ContentFile(_foto(400)), save=True)

    salida = _correr(capsys)

    assert "Miniaturas generadas: 0" in salida
