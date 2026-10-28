#!/usr/bin/env python
"""Genera los placeholders WebP que espera ``seed_imagenes_demo``.

No sobrescribe archivos existentes. Cada imagen mide 800x600 y pesa como
máximo 40 KB. Uso::

    python scripts/generar_placeholders.py
    python scripts/generar_placeholders.py --directorio /ruta/alterna
"""

import argparse
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent.parent
SEED_DIR = BASE / "seed_images"
ANCHO = 800
ALTO = 600
PESO_MAXIMO = 40 * 1024

PALETAS = {
    "frutas": ((255, 184, 77), (239, 108, 57)),
    "verduras": ((141, 196, 110), (46, 125, 50)),
    "despensa": ((226, 195, 150), (141, 110, 99)),
    "lacteos": ((190, 225, 255), (92, 151, 207)),
    "carnes": ((225, 125, 120), (155, 44, 44)),
    "pescados": ((135, 205, 232), (33, 113, 152)),
    "comidas": ((250, 205, 110), (200, 100, 40)),
    "dulces": ((246, 180, 208), (180, 80, 120)),
    "bebidas": ((155, 225, 242), (30, 120, 160)),
    "aseo": ((185, 215, 242), (70, 110, 170)),
    "artesanias": ((216, 168, 118), (120, 70, 40)),
    "panaderia": ((244, 207, 157), (160, 100, 50)),
    "puestos": ((165, 205, 165), (40, 100, 80)),
}

IMAGENES = [
    ("arroz", "Arroz", "despensa"),
    ("frijoles-rojos", "Frijoles rojos", "despensa"),
    ("aceite-vegetal", "Aceite vegetal", "despensa"),
    ("azucar-blanca", "Azúcar", "despensa"),
    ("sal-refinada", "Sal", "despensa"),
    ("leche-entera", "Leche entera", "lacteos"),
    ("huevos", "Huevos", "lacteos"),
    ("pan-tajado", "Pan tajado", "panaderia"),
    ("papa-criolla", "Papa criolla", "verduras"),
    ("platano-verde", "Plátano verde", "verduras"),
    ("yuca", "Yuca", "verduras"),
    ("cebolla-cabezona", "Cebolla cabezona", "verduras"),
    ("tomate-chonto", "Tomate chonto", "verduras"),
    ("zanahoria", "Zanahoria", "verduras"),
    ("ajo", "Ajo", "verduras"),
    ("limon-tahiti", "Limón tahití", "frutas"),
    ("naranja", "Naranja", "frutas"),
    ("manzana-verde", "Manzana verde", "frutas"),
    ("banano", "Banano", "frutas"),
    ("mango", "Mango", "frutas"),
    ("aguacate", "Aguacate", "frutas"),
    ("sandia", "Sandía", "frutas"),
    ("pescado-fresco", "Pescado fresco", "pescados"),
    ("pollo-entero", "Pollo entero", "carnes"),
    ("carne-molida", "Carne molida", "carnes"),
    ("arepas", "Arepas", "comidas"),
    ("empanadas", "Empanadas", "comidas"),
    ("buñuelos", "Buñuelos", "comidas"),
    ("cafe-molido", "Café molido", "bebidas"),
    ("agua-botella", "Agua", "bebidas"),
    ("gaseosa", "Gaseosa", "bebidas"),
    ("jabón", "Jabón", "aseo"),
    ("detergente", "Detergente", "aseo"),
    ("shampoo", "Shampoo", "aseo"),
    ("papel-higienico", "Papel higiénico", "aseo"),
    ("bolsa-basura", "Bolsa de basura", "aseo"),
    ("mochila-wayuu", "Mochila wayuu", "artesanias"),
    ("hamaca", "Hamaca", "artesanias"),
    ("tejido-wayuu", "Tejido wayuu", "artesanias"),
    ("sombrero-vueltiao", "Sombrero vueltiao", "artesanias"),
    ("manilla-artesanal", "Manilla artesanal", "artesanias"),
    ("dulces-tipicos", "Dulces típicos", "dulces"),
    ("puesto-frutas-portada", "Puesto de frutas", "puestos"),
    ("puesto-pescado-portada", "Puesto de pescado", "puestos"),
    ("puesto-comidas-portada", "Puesto de comidas", "puestos"),
    ("puesto-artesanias-portada", "Puesto de artesanías", "puestos"),
    ("puesto-aseo-portada", "Puesto de aseo", "puestos"),
]

FUENTES = (
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("C:/Windows/Fonts/segoeuib.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
)


def fuente(tamano: int):
    for ruta in FUENTES:
        if ruta.exists():
            return ImageFont.truetype(str(ruta), tamano)
    try:
        return ImageFont.load_default(size=tamano)
    except TypeError:
        return ImageFont.load_default()


def degradado(inicio: tuple[int, int, int], fin: tuple[int, int, int]) -> Image.Image:
    imagen = Image.new("RGB", (ANCHO, ALTO))
    dibujo = ImageDraw.Draw(imagen)
    for y in range(ALTO):
        proporcion = y / (ALTO - 1)
        color = tuple(
            int(a + (b - a) * proporcion) for a, b in zip(inicio, fin, strict=True)
        )
        dibujo.line([(0, y), (ANCHO, y)], fill=color)
    return imagen


def envolver(dibujo: ImageDraw.ImageDraw, texto: str, tipo, ancho: int) -> list[str]:
    lineas: list[str] = []
    actual = ""
    for palabra in texto.split():
        prueba = f"{actual} {palabra}".strip()
        if not actual or dibujo.textlength(prueba, font=tipo) <= ancho:
            actual = prueba
        else:
            lineas.append(actual)
            actual = palabra
    if actual:
        lineas.append(actual)
    return lineas


def texto_centrado(
    dibujo: ImageDraw.ImageDraw,
    y: float,
    texto: str,
    tipo,
    color: tuple[int, int, int],
) -> None:
    caja = dibujo.textbbox((0, 0), texto, font=tipo)
    ancho = caja[2] - caja[0]
    alto = caja[3] - caja[1]
    dibujo.text(
        ((ANCHO - ancho) / 2 - caja[0], y - alto / 2 - caja[1]),
        texto,
        font=tipo,
        fill=color,
    )


def crear_placeholder(etiqueta: str, categoria: str) -> Image.Image:
    inicio, fin = PALETAS.get(categoria, PALETAS["puestos"])
    imagen = degradado(inicio, fin).convert("RGBA")

    overlay = Image.new("RGBA", (ANCHO, ALTO), (0, 0, 0, 0))
    dibujo = ImageDraw.Draw(overlay)
    dibujo.ellipse((-90, -120, 330, 300), fill=(255, 255, 255, 30))
    dibujo.ellipse((560, 390, 940, 770), fill=(255, 255, 255, 26))
    dibujo.rounded_rectangle(
        (48, 78, ANCHO - 48, ALTO - 78),
        radius=36,
        fill=(255, 255, 255, 58),
        outline=(255, 255, 255, 150),
        width=3,
    )
    imagen = Image.alpha_composite(imagen, overlay)

    dibujo = ImageDraw.Draw(imagen)
    tipo_categoria = fuente(24)
    tipo_titulo = fuente(58)
    tipo_marca = fuente(20)
    lineas = envolver(dibujo, etiqueta, tipo_titulo, ANCHO - 160)
    if len(lineas) > 2:
        tipo_titulo = fuente(42)
        lineas = envolver(dibujo, etiqueta, tipo_titulo, ANCHO - 160)

    texto_centrado(
        dibujo,
        105,
        categoria.upper(),
        tipo_categoria,
        (35, 55, 65),
    )
    inicio_texto = ALTO / 2 - (len(lineas) - 1) * 38
    for indice, linea in enumerate(lineas):
        texto_centrado(
            dibujo,
            inicio_texto + indice * 76,
            linea,
            tipo_titulo,
            (24, 32, 40),
        )
    texto_centrado(
        dibujo,
        ALTO - 112,
        "RioMarket",
        tipo_marca,
        (35, 55, 65),
    )
    return imagen.convert("RGB")


def guardar_webp(imagen: Image.Image, destino: Path) -> int:
    destino.parent.mkdir(parents=True, exist_ok=True)
    for calidad in (74, 62, 50, 38):
        buffer = BytesIO()
        imagen.save(buffer, "WEBP", quality=calidad, method=6, optimize=True)
        datos = buffer.getvalue()
        if len(datos) <= PESO_MAXIMO:
            destino.write_bytes(datos)
            return len(datos)
    raise RuntimeError(f"No se pudo dejar {destino.name} por debajo de 40 KB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--directorio",
        type=Path,
        default=SEED_DIR,
        help="Carpeta de salida (por defecto seed_images/).",
    )
    opciones = parser.parse_args()
    destino = opciones.directorio
    creados = 0
    omitidos = 0
    for slug, etiqueta, categoria in IMAGENES:
        archivo = destino / f"{slug}.webp"
        if archivo.exists():
            omitidos += 1
            continue
        imagen = crear_placeholder(etiqueta, categoria)
        guardar_webp(imagen, archivo)
        creados += 1
    print(
        f"Placeholders en {destino}: {creados} creados, "
        f"{omitidos} ya existentes."
    )


if __name__ == "__main__":
    main()
