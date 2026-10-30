"""Asigna fotos demo y reemplaza las imágenes de prueba (idempotente).

Solo toca imágenes vacías o idénticas byte a byte a un placeholder de ``seed_images/``:
una foto subida por un vendedor nunca se reemplaza.
"""

import hashlib
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from apps.catalog.models import ImagenProducto, Producto, Puesto

SEED_DIR = Path(settings.BASE_DIR) / "seed_images"
FOTOS_DIR = SEED_DIR / "fotos"
PREFIJO_FOTO = "foto-demo-"

# Del nombre más específico al más general: gana la primera clave contenida en el producto.
FOTOS_PRODUCTO = (
    ("arepa de queso", "arepa-de-queso"),
    ("arepa", "arepa-de-huevo"),
    ("arroz de camarón", "arroz-de-camaron"),
    ("arroz de coco", "arroz-de-coco"),
    ("sopa de mariscos", "sopa-de-mariscos"),
    ("sopa de guandú", "sopa-de-guandu"),
    ("sancocho", "sancocho"),
    ("enrollado de coco", "enrollado-de-coco"),
    ("enrollado de dulce", "enrollado-de-dulce"),
    ("alegría de coco", "alegria-de-coco"),
    ("cocada", "cocadas"),
    ("dulce de papaya", "dulce-de-papaya"),
    ("jugo de corozo", "jugo-de-corozo"),
    ("jugo natural de mango", "jugo-de-mango"),
    ("jugo de mango", "jugo-de-mango"),
    ("mango", "mango"),
    ("aguacate", "aguacate"),
    ("patilla", "patilla"),
    ("piña", "pina"),
    ("melón", "melon"),
    ("coco", "coco"),
    ("friche", "friche-de-chivo"),
    ("chivo", "chivo-guisado"),
    ("cerdo", "cerdo-asado"),
    ("bollo", "bollo-limpio"),
    ("queso", "queso-costeno"),
    ("suero", "suero-costeno"),
    ("mojarra", "mojarra"),
    ("pescado", "pescado-frito"),
    ("bocachico", "bocachico"),
    ("sierra", "sierra"),
    ("camarón", "camaron"),
    ("jaiba", "jaiba"),
    ("lisa", "lisa"),
    ("mochila", "mochila-wayuu"),
    ("chinchorro", "chinchorro"),
    ("sombrero", "sombrero-wayuu"),
    ("pulsera", "pulsera-wayuu"),
    ("sandalia", "sandalias-wayuu"),
    ("guayabera", "guayabera"),
    ("blusa", "blusa-bordada"),
)

FOTOS_PUESTO = (
    ("palenque", "puesto-comidas"),
    ("cocina", "puesto-cocina"),
    ("comida", "puesto-comidas"),
    ("tejido", "puesto-artesanias"),
    ("artesania", "puesto-artesanias"),
    ("fruta", "puesto-frutas"),
    ("dulce", "puesto-dulces"),
    ("pescad", "puesto-pescado"),
)

# Abarrotes sin foto real: conservan su placeholder si el producto no tiene imagen.
RESPALDO_PRODUCTO = (
    ("frijol", "frijoles-rojos"),
    ("aceite", "aceite-vegetal"),
    ("azúcar", "azucar-blanca"),
    ("sal", "sal-refinada"),
    ("leche", "leche-entera"),
    ("huevo", "huevos"),
    ("pan", "pan-tajado"),
    ("papa", "papa-criolla"),
    ("plátano", "platano-verde"),
    ("yuca", "yuca"),
    ("cebolla", "cebolla-cabezona"),
    ("tomate", "tomate-chonto"),
    ("zanahoria", "zanahoria"),
    ("ajo", "ajo"),
    ("limón", "limon-tahiti"),
    ("naranja", "naranja"),
    ("manzana", "manzana-verde"),
    ("banano", "banano"),
    ("pollo", "pollo-entero"),
    ("carne molida", "carne-molida"),
    ("arroz", "arroz"),
    ("empanada", "empanadas"),
    ("buñuelo", "buñuelos"),
    ("café", "cafe-molido"),
    ("agua", "agua-botella"),
    ("gaseosa", "gaseosa"),
    ("jabón", "jabón"),
    ("detergente", "detergente"),
    ("shampoo", "shampoo"),
    ("papel", "papel-higienico"),
    ("bolsa", "bolsa-basura"),
)


def _buscar(tabla, nombre: str, carpeta: Path) -> Path | None:
    nombre = nombre.lower()
    for clave, slug in tabla:
        if clave in nombre:
            ruta = carpeta / f"{slug}.webp"
            return ruta if ruta.exists() else None
    return None


def foto_de_producto(nombre: str) -> Path | None:
    return _buscar(FOTOS_PRODUCTO, nombre, FOTOS_DIR)


def foto_de_puesto(nombre: str) -> Path | None:
    return _buscar(FOTOS_PUESTO, nombre, FOTOS_DIR)


def respaldo_de_producto(nombre: str) -> Path | None:
    return _buscar(RESPALDO_PRODUCTO, nombre, SEED_DIR)


def _huellas_de_prueba() -> set[str]:
    return {hashlib.sha256(ruta.read_bytes()).hexdigest() for ruta in SEED_DIR.glob("*.webp")}


def _es_de_prueba(archivo, de_prueba: set[str]) -> bool:
    """True si hay que (re)poner la foto demo: es un placeholder o el archivo ya no existe."""
    try:
        with archivo.open("rb") as abierto:
            contenido = abierto.read()
    except FileNotFoundError:
        # Disco efímero: el redeploy borró el archivo y la base conserva la ruta. Se recrea
        # también cuando es una foto demo, o la imagen quedaría rota hasta el siguiente cambio.
        return True
    if Path(archivo.name).name.startswith(PREFIJO_FOTO):
        return False
    return hashlib.sha256(contenido).hexdigest() in de_prueba


def _archivo(ruta: Path, prefijo: str = "") -> ContentFile:
    contenido = ContentFile(ruta.read_bytes())
    contenido.name = f"{PREFIJO_FOTO}{prefijo}{ruta.name}"
    return contenido


class Command(BaseCommand):
    help = "Asigna fotos demo a productos/puestos y reemplaza las de prueba (idempotente)."

    def handle(self, *args, **options):
        if not SEED_DIR.exists():
            self.stdout.write("seed_images/ no existe; omitiendo.")
            return
        de_prueba = _huellas_de_prueba()
        total = 0
        for producto in Producto.objects.prefetch_related("imagenes"):
            total += self._asignar_producto(producto, de_prueba)
        for puesto in Puesto.objects.all():
            total += self._asignar_puesto(puesto, de_prueba)
        self.stdout.write(self.style.SUCCESS(f"Imágenes asignadas: {total}"))

    def _asignar_producto(self, producto: Producto, de_prueba: set[str]) -> int:
        foto = foto_de_producto(producto.nombre)
        imagenes = list(producto.imagenes.all())
        cambios = 0
        try:
            if not imagenes:
                ruta = foto or respaldo_de_producto(producto.nombre)
                if ruta:
                    ImagenProducto.objects.create(
                        id_producto=producto,
                        archivo=_archivo(ruta),
                        orden=1,
                        alt=producto.nombre,
                        es_principal=True,
                    )
                    cambios = 1
            for imagen in imagenes:
                if not _es_de_prueba(imagen.archivo, de_prueba):
                    continue
                if foto:
                    imagen.archivo.delete(save=False)
                    if imagen.miniatura:
                        imagen.miniatura.delete(save=False)
                    imagen.archivo = _archivo(foto)
                    imagen.miniatura = None
                    imagen.ancho = imagen.alto = None
                    imagen.save()
                else:
                    # Sin foto que corresponda: mejor el fondo neutro de la tarjeta.
                    imagen.delete()
                cambios += 1
        except Exception as e:
            print("ERR img prod", producto.id, e)
        return cambios

    def _asignar_puesto(self, puesto: Puesto, de_prueba: set[str]) -> int:
        foto = foto_de_puesto(puesto.nombre)
        if not foto:
            return 0
        cambios = 0
        for campo in ("portada", "logo"):
            actual = getattr(puesto, campo)
            try:
                if actual and not _es_de_prueba(actual, de_prueba):
                    continue
                if actual:
                    actual.delete(save=False)
                setattr(puesto, campo, _archivo(foto, f"{campo}-"))
                puesto.save(update_fields=[campo])
                cambios += 1
            except Exception as e:
                print("ERR img puesto", puesto.id, e)
        return cambios
