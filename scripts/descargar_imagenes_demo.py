#!/usr/bin/env python
"""Descarga imágenes demo desde Pexels si hay PEXELS_API_KEY. Genera CREDITOS.md.

Si no hay clave, imprime lista exacta de archivos que hay que colocar en seed_images/
con nombres por slug de producto.
"""
import json
import os
from pathlib import Path

import requests
from PIL import Image, ImageOps

BASE = Path(__file__).resolve().parent.parent
SEED_DIR = BASE / "seed_images"

PRODUCTOS = [
    ("arroz", "arroz"),
    ("frijoles-rojos", "fríjoles rojos"),
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


def optimizar_webp(src: Path, dst: Path, size: int = 800):
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="WEBP", quality=80, method=6)
    try:
        src.unlink()
    except Exception:
        pass


def main():
    key = os.environ.get("PEXELS_API_KEY") or os.environ.get("UNSPLASH_ACCESS_KEY") or ""
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    creditos = SEED_DIR / "CREDITOS.md"
    if key:
        headers = {"Authorization": key} if key and "pexels" in key.lower() or os.environ.get("PEXELS_API_KEY") else {"Authorization": os.environ.get("PEXELS_API_KEY", "")}
        if os.environ.get("PEXELS_API_KEY"):
            headers = {"Authorization": os.environ.get("PEXELS_API_KEY")}
            lineas = ["# Créditos de imágenes demo", ""]
            for slug, query in PRODUCTOS:
                out = SEED_DIR / f"{slug}.webp"
                if out.exists():
                    continue
                try:
                    r = requests.get(
                        "https://api.pexels.com/v1/search",
                        headers=headers,
                        params={"query": query, "per_page": 1, "orientation": "landscape"},
                        timeout=30,
                    )
                    if r.status_code == 200:
                        data = r.json()
                        fotos = data.get("photos") or []
                        if fotos:
                            url = fotos[0]["src"].get("large") or fotos[0]["src"].get("medium")
                            img_r = requests.get(url, timeout=60)
                            tmp = SEED_DIR / f"{slug}.tmp.jpg"
                            tmp.write_bytes(img_r.content)
                            optimizar_webp(tmp, out)
                            p = fotos[0]
                            lineas.append(f"- {slug}.webp: [Pexels]({p['url']}) por {p['photographer']} (licencia Pexels)")
                except Exception as e:
                    print("ERR", slug, e)
            for slug, query in PUESTOS:
                out = SEED_DIR / f"{slug}-portada.webp"
                if out.exists():
                    continue
                try:
                    r = requests.get(
                        "https://api.pexels.com/v1/search",
                        headers=headers,
                        params={"query": query, "per_page": 1},
                        timeout=30,
                    )
                    if r.status_code == 200:
                        data = r.json()
                        fotos = data.get("photos") or []
                        if fotos:
                            url = fotos[0]["src"].get("large") or fotos[0]["src"].get("medium")
                            img_r = requests.get(url, timeout=60)
                            tmp = SEED_DIR / f"{slug}.tmp.jpg"
                            tmp.write_bytes(img_r.content)
                            optimizar_webp(tmp, out)
                            p = fotos[0]
                            lineas.append(f"- {slug}-portada.webp: [Pexels]({p['url']}) por {p['photographer']} (licencia Pexels)")
                except Exception as e:
                    print("ERR", slug, e)
            creditos.write_text("\n".join(lineas) + "\n", encoding="utf-8")
            print("Descarga completada")
            return
    faltan = []
    for slug, _ in PRODUCTOS:
        if not (SEED_DIR / f"{slug}.webp").exists():
            faltan.append(f"seed_images/{slug}.webp")
    for slug, _ in PUESTOS:
        if not (SEED_DIR / f"{slug}-portada.webp").exists():
            faltan.append(f"seed_images/{slug}-portada.webp")
            if not (SEED_DIR / f"{slug}-logo.webp").exists():
                faltan.append(f"seed_images/{slug}-logo.webp")
    print("SIN PEXELS_API_KEY - coloca estos archivos manualmente:")
    for f in faltan:
        print(f)
    creditos.write_text("# Créditos de imágenes demo\n\nPendiente: completar con fotógrafo/enlace/licencia al añadir imágenes.\n", encoding="utf-8")


if __name__ == "__main__":
    main()
