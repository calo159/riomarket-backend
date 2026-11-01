"""``seed_imagenes_demo`` cambia solo imágenes de prueba, nunca las de un vendedor."""

from io import BytesIO

import pytest
from django.core.files.base import ContentFile
from django.core.management import call_command
from PIL import Image

from apps.catalog.models import ImagenProducto, Producto
from apps.demo.management.commands.seed_imagenes_demo import (
    SEED_DIR,
    foto_de_producto,
    respaldo_de_producto,
)
from tests.factories import ProductoFactory, PuestoFactory

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media_temporal(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def _imagen(producto, contenido: bytes, nombre="x.webp") -> ImagenProducto:
    archivo = ContentFile(contenido, name=nombre)
    return ImagenProducto.objects.create(id_producto=producto, archivo=archivo, es_principal=True)


def _foto_propia() -> bytes:
    salida = BytesIO()
    Image.new("RGB", (20, 20), "red").save(salida, "PNG")
    return salida.getvalue()


@pytest.mark.parametrize(
    "nombre,esperada",
    [
        ("Aguacate (kg)", "aguacate"),
        ("Arepa de queso", "arepa-de-queso"),
        ("Arepa de huevo", "arepa-de-huevo"),
        ("Arroz de coco", "arroz-de-coco"),
        ("Coco (unidad)", "coco"),
        ("Jugo natural de mango", "jugo-de-mango"),
        ("Mango de azúcar (kg)", "mango"),
    ],
)
def test_cada_producto_recibe_su_foto(nombre, esperada):
    assert foto_de_producto(nombre).stem == esperada


def test_el_agua_no_se_confunde_con_el_aguacate():
    assert foto_de_producto("Agua en botella") is None
    assert respaldo_de_producto("Agua en botella").stem == "agua-botella"


def test_reemplaza_la_imagen_de_prueba_por_la_foto_real():
    producto = ProductoFactory(nombre="Aguacate (kg)")
    imagen = _imagen(producto, (SEED_DIR / "agua-botella.webp").read_bytes())

    call_command("seed_imagenes_demo")

    imagen.refresh_from_db()
    assert "foto-demo-aguacate" in imagen.archivo.name


def test_no_toca_la_foto_de_un_vendedor():
    producto = ProductoFactory(nombre="Aguacate (kg)")
    imagen = _imagen(producto, _foto_propia(), "mia.png")
    nombre = imagen.archivo.name

    call_command("seed_imagenes_demo")

    imagen.refresh_from_db()
    assert imagen.archivo.name == nombre


def test_sin_foto_que_corresponda_quita_la_imagen_de_prueba(capsys):
    producto = ProductoFactory(nombre="Hielo en cubos")
    _imagen(producto, (SEED_DIR / "naranja.webp").read_bytes())

    call_command("seed_imagenes_demo")

    assert not producto.imagenes.exists()
    assert "ERR" not in capsys.readouterr().out


def test_es_idempotente():
    producto = ProductoFactory(nombre="Mojarra al ajillo")

    call_command("seed_imagenes_demo")
    primera = Producto.objects.get(pk=producto.pk).imagenes.get().archivo.name
    call_command("seed_imagenes_demo")

    assert Producto.objects.get(pk=producto.pk).imagenes.get().archivo.name == primera


def test_recrea_la_foto_demo_cuando_el_redeploy_borro_el_archivo():
    """Render usa disco efímero: la base conserva la ruta pero el archivo desaparece."""
    producto = ProductoFactory(nombre="Aguacate (kg)")
    call_command("seed_imagenes_demo")
    imagen = producto.imagenes.get()
    imagen.archivo.storage.delete(imagen.archivo.name)
    assert not imagen.archivo.storage.exists(imagen.archivo.name)

    call_command("seed_imagenes_demo")

    imagen.refresh_from_db()
    assert imagen.archivo.storage.exists(imagen.archivo.name)
    assert "foto-demo-aguacate" in imagen.archivo.name


def test_recrea_la_portada_de_un_puesto_cuando_el_archivo_desaparecio():
    puesto = PuestoFactory(nombre="Frutas del Caribe")
    call_command("seed_imagenes_demo")
    puesto.refresh_from_db()
    puesto.portada.storage.delete(puesto.portada.name)

    call_command("seed_imagenes_demo")

    puesto.refresh_from_db()
    assert puesto.portada.storage.exists(puesto.portada.name)


def test_la_foto_demo_nueva_lleva_miniatura_y_medidas():
    producto = ProductoFactory(nombre="Aguacate (kg)")

    call_command("seed_imagenes_demo")

    imagen = producto.imagenes.get()
    assert imagen.miniatura
    assert imagen.miniatura.name != imagen.archivo.name
    assert (imagen.ancho, imagen.alto) == (640, 640)
    with Image.open(imagen.miniatura) as mini:
        assert max(mini.size) == 400
    # El original no se vuelve a codificar: queda byte a byte como el de seed_images/.
    assert imagen.archivo.read() == (SEED_DIR / "fotos" / "aguacate.webp").read_bytes()


def test_la_foto_demo_reemplazada_trae_miniatura_y_medidas():
    producto = ProductoFactory(nombre="Aguacate (kg)")
    imagen = _imagen(producto, (SEED_DIR / "agua-botella.webp").read_bytes())
    assert not imagen.miniatura

    call_command("seed_imagenes_demo")

    imagen.refresh_from_db()
    assert imagen.miniatura
    assert (imagen.ancho, imagen.alto) == (640, 640)


def _lado_mayor(campo) -> int:
    with campo.open("rb") as abierto, Image.open(abierto) as imagen:
        return max(imagen.size)


def test_el_logo_demo_del_puesto_es_pequeno_y_la_portada_conserva_su_tamano():
    puesto = PuestoFactory(nombre="Frutas del Caribe")

    call_command("seed_imagenes_demo")

    puesto.refresh_from_db()
    assert _lado_mayor(puesto.logo) == 192
    assert _lado_mayor(puesto.portada) == 640
    assert puesto.logo.size < puesto.portada.size / 4


def test_reduce_el_logo_demo_que_un_despliegue_viejo_dejo_grande():
    puesto = PuestoFactory(nombre="Frutas del Caribe")
    grande = (SEED_DIR / "fotos" / "puesto-frutas.webp").read_bytes()
    puesto.logo.save("foto-demo-logo-puesto-frutas.webp", ContentFile(grande), save=True)
    assert _lado_mayor(puesto.logo) == 640

    call_command("seed_imagenes_demo")

    puesto.refresh_from_db()
    assert _lado_mayor(puesto.logo) == 192


def test_no_reduce_el_logo_que_subio_un_vendedor():
    puesto = PuestoFactory(nombre="Frutas del Caribe")
    propio = BytesIO()
    Image.new("RGB", (640, 640), "blue").save(propio, "PNG")
    puesto.logo.save("mi-logo.png", ContentFile(propio.getvalue()), save=True)
    nombre = puesto.logo.name

    call_command("seed_imagenes_demo")

    puesto.refresh_from_db()
    assert puesto.logo.name == nombre
    assert _lado_mayor(puesto.logo) == 640
