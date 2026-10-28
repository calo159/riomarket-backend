#!/usr/bin/env python
"""Descarga imágenes demo desde Pexels si hay PEXELS_API_KEY.

Si no hay clave, genera placeholders .webp con Pillow para que la demo tenga
imágenes desde el primer arranque. Reemplázalos por fotos reales cuando quieras.
"""
import contextlib
import os
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

BASE = Path(__file__).resolve().parent.parent
SEED_DIR = BASE / "seed_images"

PRODUCTOS = [
    ("arroz", "arroz"),
    ("frijoles-rojos", "frijoles rojos"),
    ("aceite-vegetal", "aceite vegetal"),
    ("azucar-blanca", "azúcar"),
    ("sal-refinada", "sal"),
    ("leche-entera", "leche"),
    ("huevos", "huevos"),
    ("pan-tajado", "pan"),
    ("papa-criolla", "papa"),
    ("platano-verde", "plátano"),
    ("yuca", "yuca"),
    ("cebolla-cabezona", "cebolla"),
    ("tomate-chonto", "tomate"),
    ("zanahoria", "zanahoria"),
    ("ajo", "ajo"),
    ("limon-tahiti", "limón"),
    ("naranja", "naranja"),
    ("manzana-verde", "manzana"),
    ("banano", "banano"),
    ("mango", "mango"),
    ("aguacate", "aguacate"),
    ("sandia", "sandía"),
    ("pescado-fresco", "pescado"),
    ("pollo-entero", "pollo"),
    ("carne-molida", "carne molida"),
    ("arepas", "arepas"),
    ("empanadas", "empanadas"),
    ("buñuelos", "buñuelos"),
    ("cafe-molido", "café"),
    ("agua-botella", "agua"),
    ("gaseosa", "gaseosa"),
    ("jabón", "jabón"),
    ("detergente", "detergente"),
    ("shampoo", "shampoo"),
    ("papel-higienico", "papel higiénico"),
    ("bolsa-basura", "bolsa basura"),
    ("mochila-wayuu", "mochila wayuu"),
    ("hamaca", "hamaca"),
    ("tejido-wayuu", "tejido wayuu"),
    ("sombrero-vueltiao", "sombrero vueltiao"),
    ("manilla-artesanal", "manilla artesanal"),
    ("dulces-tipicos", "dulces típicos"),
]

PUESTOS = [
    ("puesto-frutas", "frutas mercado"),
    ("puesto-pescado", "pescado mercado"),
    ("puesto-comidas", "comida callejera"),
    ("puesto-artesanias", "artesanías"),
    ("puesto-aseo", "productos aseo"),
]

COLORES = [
    (16, 185, 129),
    (13, 148, 136),
    (245, 158, 11),
    (234, 88, 12),
    (59, 130, 246),
    (139, 92, 246),
    (236, 72, 153),
]


def optimizar_webp(src: Path, dst: Path, size: int = 800):
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="WEBP", quality=80, method=6)
    with contextlib.suppress(OSError):
        src.unlink()


def _fuente(tamano: int):
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", tamano)
    except OSError:
        return ImageFont.load_default(size=tamano)


def generar_placeholder(dst: Path, nombre: str):
    ancho, alto = 800, 600
    color = COLORES[sum(ord(c) for c in nombre) % len(COLORES)]
    img = Image.new("RGB", (ancho, alto), color)
    draw = ImageDraw.Draw(img)
    fuente = _fuente(52)

    palabras = nombre.upper().split()
    lineas: list[str] = []
    actual = ""
    for palabra in palabras:
        candidato = f"{actual} {palabra}".strip()
        if draw.textlength(candidato, font=fuente) <= ancho - 100:
            actual = candidato
        else:
            if actual:
                lineas.append(actual)
            actual = palabra
    if actual:
        lineas.append(actual)

    alto_linea = 64
    y = (alto - len(lineas) * alto_linea) / 2
    for linea in lineas:
        ancho_texto = draw.textlength(linea, font=fuente)
        x = (ancho - ancho_texto) / 2
        draw.text((x + 2, y + 2), linea, font=fuente, fill=(0, 0, 0))
        draw.text((x, y), linea, font=fuente, fill=(255, 255, 255))
        y += alto_linea

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="WEBP", quality=78, method=6)


def _descargar_pexels(headers: dict[str, str], query: str, salida: Path) -> dict | None:
    r = requests.get(
        "https://api.pexels.com/v1/search",
        headers=headers,
        params={"query": query, "per_page": 1, "orientation": "landscape"},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    fotos = r.json().get("photos") or []
    if not fotos:
        return None
    foto = fotos[0]
    url = foto["src"].get("large") or foto["src"].get("medium")
    img_r = requests.get(url, timeout=60)
    tmp = salida.with_suffix(".tmp.jpg")
    tmp.write_bytes(img_r.content)
    optimizar_webp(tmp, salida)
    return foto


def main():
    pexels_key = os.environ.get("PEXELS_API_KEY", "").strip()
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    creditos = SEED_DIR / "CREDITOS.md"

    if pexels_key:
        headers = {"Authorization": pexels_key}
        lineas = ["# Créditos de imágenes demo", ""]
        for slug, query in PRODUCTOS:
            salida = SEED_DIR / f"{slug}.webp"
            if salida.exists():
                continue
            try:
                foto = _descargar_pexels(headers, query, salida)
                if foto:
                    lineas.append(
                        f"- {slug}.webp: [Pexels]({foto['url']}) por "
                        f"{foto['photographer']} (licencia Pexels)"
                    )
            except Exception as e:
                print("ERR", slug, e)
        for slug, query in PUESTOS:
            salida = SEED_DIR / f"{slug}-portada.webp"
            if salida.exists():
                continue
            try:
                foto = _descargar_pexels(headers, query, salida)
                if foto:
                    lineas.append(
                        f"- {slug}-portada.webp: [Pexels]({foto['url']}) por "
                        f"{foto['photographer']} (licencia Pexels)"
                    )
            except Exception as e:
                print("ERR", slug, e)
        if len(lineas) > 2:
            creditos.write_text("\n".join(lineas) + "\n", encoding="utf-8")
            print("Descarga completada")
        else:
            print("No se descargaron imágenes nuevas (ya existen archivos).")
        return

    esperados = [(f"{slug}.webp", query) for slug, query in PRODUCTOS]
    esperados += [(f"{slug}-portada.webp", query) for slug, query in PUESTOS]
    generados = []
    for archivo, nombre in esperados:
        salida = SEED_DIR / archivo
        if not salida.exists():
            generar_placeholder(salida, nombre)
            generados.append(archivo)

    lineas = [
        "# Créditos de imágenes demo",
        "",
        "Estas imágenes son placeholders generados con Pillow (sin licencia externa).",
        "Reemplázalas por fotos reales con licencia libre (Pexels/Unsplash) manteniendo el nombre.",
        "",
        "## Archivos esperados",
        "",
    ]
    lineas += [f"- {archivo}: `{nombre}`" for archivo, nombre in esperados]
    creditos.write_text("\n".join(lineas) + "\n", encoding="utf-8")

    if generados:
        print("SIN PEXELS_API_KEY - placeholders generados:")
        for archivo in generados:
            print(f"seed_images/{archivo}")
    else:
        print("SIN PEXELS_API_KEY - las imágenes demo ya existen en seed_images/.")


if __name__ == "__main__":
    main()
