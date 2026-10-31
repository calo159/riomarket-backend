"""Genera ``frontend/public/og-riomarket.png`` (1200x630): la imagen al compartir enlaces.

Fondo turquesa plano, «Rio» blanco y «Market» amarillo en Figtree 800 (la misma fuente del sitio,
tomada de ``node_modules``) y una línea inferior. Sin degradados ni adornos.

Uso (desde la raíz del repositorio, con ``npm ci`` hecho en ``frontend/``):
    python scripts/generar_og.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = (
    RAIZ
    / "frontend"
    / "node_modules"
    / "@fontsource-variable"
    / "figtree"
    / "files"
    / "figtree-latin-wght-normal.woff2"
)
SALIDA = RAIZ / "frontend" / "public" / "og-riomarket.png"

ANCHO, ALTO = 1200, 630
TURQUESA = "#00626D"
BLANCO = "#FFFFFF"
AMARILLO = "#FFD166"


def fuente(tamano: int) -> ImageFont.FreeTypeFont:
    tipo = ImageFont.truetype(str(FUENTE), tamano)
    tipo.set_variation_by_axes([800])
    return tipo


def main() -> None:
    imagen = Image.new("RGB", (ANCHO, ALTO), TURQUESA)
    dibujo = ImageDraw.Draw(imagen)

    grande = fuente(190)
    rio, market = "Rio", "Market"
    ancho_rio = dibujo.textlength(rio, font=grande)
    ancho_total = ancho_rio + dibujo.textlength(market, font=grande)
    x = (ANCHO - ancho_total) / 2
    y = 335  # línea base compartida por ambas palabras
    dibujo.text((x, y), rio, font=grande, fill=BLANCO, anchor="ls")
    dibujo.text((x + ancho_rio, y), market, font=grande, fill=AMARILLO, anchor="ls")

    linea = fuente(54)
    dibujo.text(
        (ANCHO / 2, 440), "El mercado de Riohacha en línea", font=linea, fill=BLANCO, anchor="mm"
    )
    imagen.save(SALIDA, format="PNG", optimize=True)
    print(f"Imagen escrita en {SALIDA} ({SALIDA.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
