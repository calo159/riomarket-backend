#!/usr/bin/env python
"""Busca candidatas libres en Openverse (sin API key) para ``seed_images``.

Las descargas van a ``seed_images/candidatas/`` y nunca sobrescriben los
placeholders ni las fotos ya versionadas. Si no hay red, termina sin error y
avisa. Uso::

    python scripts/buscar_imagenes_libres.py
"""

import json
import time
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

try:
    from generar_placeholders import IMAGENES, guardar_webp
except ImportError:
    from scripts.generar_placeholders import IMAGENES, guardar_webp

BASE = Path(__file__).resolve().parent.parent
SEED_DIR = BASE / "seed_images"
CANDIDATAS = SEED_DIR / "candidatas"
CREDITOS = SEED_DIR / "CREDITOS.md"
API = "https://api.openverse.org/v1/images/"
MARCA = "<!-- candidatas-openverse -->"
CABECERAS = {
    "Accept": "application/json",
    "User-Agent": "RioMarketSeed/1.0 (demo educativa)",
}
TIEMPO_LIMITE = 20


def consultar(etiqueta: str) -> dict | None:
    parametros = urlencode(
        {
            "q": etiqueta,
            "license_type": "commercial",
            "page_size": 1,
        }
    )
    solicitud = Request(f"{API}?{parametros}", headers=CABECERAS)
    with urlopen(solicitud, timeout=TIEMPO_LIMITE) as respuesta:
        datos = json.loads(respuesta.read().decode("utf-8"))
    resultados = datos.get("results") or []
    return resultados[0] if resultados else None


def descargar(url: str) -> bytes:
    solicitud = Request(url, headers=CABECERAS)
    with urlopen(solicitud, timeout=TIEMPO_LIMITE) as respuesta:
        return respuesta.read()


def optimizar(datos: bytes) -> Image.Image:
    imagen = Image.open(BytesIO(datos))
    imagen = ImageOps.exif_transpose(imagen).convert("RGB")
    return ImageOps.fit(imagen, (800, 600), method=Image.Resampling.LANCZOS)


def registrar_creditos(lineas: list[str]) -> None:
    if not lineas:
        return
    texto = CREDITOS.read_text(encoding="utf-8") if CREDITOS.exists() else ""
    if MARCA not in texto:
        texto = texto.rstrip() + (
            "\n\n## Candidatas de Openverse\n\n"
            f"{MARCA}\n\n"
            "Revisa la licencia antes de mover una candidata a `seed_images/`.\n"
        )
    texto = texto.rstrip() + "\n" + "\n".join(lineas) + "\n"
    CREDITOS.write_text(texto, encoding="utf-8")


def credito(slug: str, resultado: dict) -> str:
    titulo = (resultado.get("title") or slug).replace("\n", " ")
    autor = resultado.get("creator") or "autor desconocido"
    licencia = " ".join(
        parte
        for parte in (resultado.get("license"), resultado.get("license_version"))
        if parte
    )
    enlace = (
        resultado.get("foreign_landing_url")
        or resultado.get("creator_url")
        or resultado.get("url")
        or ""
    )
    detalle = f"[origen]({enlace})" if enlace else "origen no informado"
    return f"- `candidatas/{slug}.webp`: \"{titulo}\" por {autor} - {detalle} ({licencia})"


def main() -> None:
    CANDIDATAS.mkdir(parents=True, exist_ok=True)
    descargadas = 0
    omitidas = 0
    fallos = 0
    creditos: list[str] = []

    for slug, etiqueta, _categoria in IMAGENES:
        destino = CANDIDATAS / f"{slug}.webp"
        if destino.exists():
            omitidas += 1
            continue
        try:
            resultado = consultar(etiqueta)
            if not resultado:
                print(f"Sin resultados para {etiqueta}.")
                fallos += 1
                continue
            url = resultado.get("thumbnail") or resultado.get("url")
            if not url:
                print(f"Resultado sin URL para {etiqueta}.")
                fallos += 1
                continue
            imagen = optimizar(descargar(url))
            guardar_webp(imagen, destino)
            creditos.append(credito(slug, resultado))
            descargadas += 1
            time.sleep(0.3)
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            print(f"No se pudo consultar Openverse ({error}). Se omite {slug}.")
            fallos += 1
            break
        except Exception as error:
            print(f"Se omite {slug}: {error}")
            fallos += 1

    registrar_creditos(creditos)
    print(
        f"Candidatas: {descargadas} descargadas, {omitidas} ya existentes, "
        f"{fallos} sin resultado o con error. Revisa {CREDITOS}."
    )


if __name__ == "__main__":
    main()
