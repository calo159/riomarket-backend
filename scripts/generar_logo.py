"""Genera el logo de RioMarket en ``frontend/public``: símbolo, versiones horizontales y favicon.

Idea: un toldo de puesto de mercado (franjas coral y crema con el borde festoneado) sobre dos olas
de río, el Ranchería de Riohacha. Se lee grande y pequeño. Las letras del logo horizontal se
convierten en trazos (Figtree 800, la fuente del sitio) para que los archivos no dependan de
ninguna tipografía.

Uso (desde la raíz del repositorio, con ``npm ci`` hecho en ``frontend/``):
    pip install fonttools brotli
    python scripts/generar_logo.py

Los PNG (íconos de la app y tarjeta para redes) salen de estos SVG con
``node frontend/scripts/exportar-marca.mjs``.
"""

from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "frontend" / "public"
FUENTE = (
    RAIZ
    / "frontend"
    / "node_modules"
    / "@fontsource-variable"
    / "figtree"
    / "files"
    / "figtree-latin-wght-normal.woff2"
)

TURQUESA = "#00626D"
CORAL = "#E4502A"  # el coral de acción (#CF3F1B) aclarado para separarlo del turquesa
CREMA = "#FFF4DC"
AMARILLO = "#FFD166"
AGUA = "#BFE3E7"  # segunda ola: turquesa muy claro, limpio sobre el fondo
BLANCO = "#FFFFFF"


def toldo(n=4, x0=9.0, x1=55.0, y_sup=11.0, y_inf=25.0, ancho_sup=30.0):
    """Paneles del toldo: franjas trapezoidales con el borde inferior en media luna."""
    centro = (x0 + x1) / 2
    sup0 = centro - ancho_sup / 2
    paso_sup = ancho_sup / n
    paso_inf = (x1 - x0) / n
    radio = paso_inf / 2
    piezas = []
    for i in range(n):
        izq_sup, der_sup = sup0 + paso_sup * i, sup0 + paso_sup * (i + 1)
        izq_inf, der_inf = x0 + paso_inf * i, x0 + paso_inf * (i + 1)
        trazo = (
            f"M{izq_sup:.2f} {y_sup}L{der_sup:.2f} {y_sup}L{der_inf:.2f} {y_inf}"
            f"A{radio:.2f} {radio:.2f} 0 0 1 {izq_inf:.2f} {y_inf}Z"
        )
        color = (CORAL, CREMA)[i % 2]
        piezas.append(f'<path d="{trazo}" fill="{color}"/>')
    return "".join(piezas)


def olas(y, color, ancho_trazo=3.8, x0=9.0, tramos=4, paso=11.5, alto=3.6):
    continuacion = "".join(f"t{paso} 0" for _ in range(tramos - 1))
    trazo = f"M{x0} {y}q{paso / 2} {-alto * 2} {paso} 0{continuacion}"
    return (
        f'<path d="{trazo}" fill="none" stroke="{color}" stroke-width="{ancho_trazo}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
    )


def simbolo(sin_fondo=False, simple=False):
    """Contenido del símbolo en un lienzo de 64 por 64."""
    fondo = "" if sin_fondo else f'<rect width="64" height="64" rx="14" fill="{TURQUESA}"/>'
    if simple:
        # Para tamaños de pestaña (16 a 32 px): un toldo de tres paneles y una sola ola gruesa.
        cuerpo = toldo(n=3, x0=8, x1=56, y_sup=8, y_inf=25, ancho_sup=30) + olas(
            47, AMARILLO, ancho_trazo=6.4, x0=8, tramos=3, paso=16, alto=5.2
        )
    else:
        cuerpo = toldo(y_sup=10, y_inf=24) + olas(40.5, AMARILLO) + olas(50, AGUA)
    return fondo + cuerpo


def svg(contenido, ancho=64, alto=64):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" role="img" '
        f'aria-label="RioMarket">{contenido}</svg>\n'
    )


class Letras:
    """Convierte texto en trazos con Figtree 800 (seguimiento -0.03em, como la marca en la web)."""

    def __init__(self):
        variable = TTFont(str(FUENTE))
        fuente = instancer.instantiateVariableFont(variable, {"wght": 800}, inplace=False)
        self.glifos = fuente.getGlyphSet()
        self.cmap = fuente.getBestCmap()
        self.upm = fuente["head"].unitsPerEm
        self.avances = fuente["hmtx"]
        self.altura_mayuscula = fuente["OS/2"].sCapHeight

    def trazos(self, texto, tamano, x, base, color, seguimiento=-0.03):
        escala = tamano / self.upm
        piezas, cursor = [], x
        for letra in texto:
            nombre = self.cmap[ord(letra)]
            pluma = SVGPathPen(self.glifos)
            self.glifos[nombre].draw(TransformPen(pluma, (escala, 0, 0, -escala, cursor, base)))
            if pluma.getCommands():
                piezas.append(f'<path d="{pluma.getCommands()}"/>')
            cursor += self.avances[nombre][0] * escala + seguimiento * tamano
        return f'<g fill="{color}">{"".join(piezas)}</g>', cursor

    def horizontal(self, color_rio, color_market, con_fondo=True, tamano=38.0):
        marca = simbolo(sin_fondo=not con_fondo)
        base = 32 + self.altura_mayuscula / self.upm * tamano / 2  # centra las mayúsculas
        rio, x = self.trazos("Rio", tamano, 64 + 14, base, color_rio)
        market, x = self.trazos("Market", tamano, x, base, color_market)
        return svg(marca + rio + market, ancho=round(x + 2, 1))


def escribir(ruta, contenido):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(contenido, encoding="utf-8")
    print(f"{ruta.relative_to(RAIZ)}  ({len(contenido)} bytes)")


def main():
    letras = Letras()
    marca = PUBLICO / "brand"
    escribir(marca / "marca.svg", svg(simbolo()))
    escribir(marca / "marca-sin-fondo.svg", svg(simbolo(sin_fondo=True)))
    escribir(marca / "logo-horizontal.svg", letras.horizontal(TURQUESA, CORAL))
    escribir(
        marca / "logo-horizontal-sobre-oscuro.svg",
        letras.horizontal(BLANCO, AMARILLO, con_fondo=False),
    )
    escribir(PUBLICO / "favicon.svg", svg(simbolo(simple=True)))


if __name__ == "__main__":
    main()
