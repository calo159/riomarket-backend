"""Genera las paletas de color de la marca que el administrador puede elegir desde el panel.

La paleta original (turquesa) se conserva tal cual. Las demás se obtienen girando su tono en OKLCH y
conservando la luminosidad de cada escalón: así el blanco sobre el 600 y el 600 sobre blanco dan el
mismo contraste que en la original, sea cual sea el tono. Si un color cae fuera de sRGB se le
baja la
saturación hasta que cabe, nunca la luminosidad.

Uso: ``python scripts/generar_paletas_marca.py`` imprime el CSS que va en
``frontend/src/paletasMarca.css`` y comprueba los contrastes.
"""

from __future__ import annotations

import math

ESCALONES = (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)
TURQUESA = {
    50: "#E5F3F4",
    100: "#CFE8EB",
    200: "#A8D3D8",
    300: "#7DB6BC",
    400: "#4A9AA4",
    500: "#1A7782",
    600: "#00626D",
    700: "#004A52",
    800: "#003A41",
    900: "#002C32",
    950: "#001B1F",
}
# clave: (etiqueta, giro de tono en grados, factor de saturación)
PALETAS = {
    "azul": ("Azul mar", 50, 1.0),
    "verde": ("Verde selva", -52, 0.95),
    "ciruela": ("Ciruela", 120, 0.9),
    "pizarra": ("Pizarra", 45, 0.28),
}


def _lineal(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gamma(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hex_a_oklch(h: str) -> tuple[float, float, float]:
    r, g, b = (_lineal(int(h[i : i + 2], 16) / 255) for i in (1, 3, 5))
    lc = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = lc ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    big_l = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return big_l, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def oklch_a_rgb(big_l: float, c: float, h: float) -> tuple[float, float, float] | None:
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_ = big_l + 0.3963377774 * a + 0.2158037573 * b
    m_ = big_l - 0.1055613458 * a - 0.0638541728 * b
    s_ = big_l - 0.0894841775 * a - 1.2914855480 * b
    lc, m, s = l_**3, m_**3, s_**3
    rgb = (
        4.0767416621 * lc - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * lc + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * lc - 0.7034186147 * m + 1.7076147010 * s,
    )
    if any(v < -1e-4 or v > 1 + 1e-4 for v in rgb):
        return None
    return tuple(min(1.0, max(0.0, v)) for v in rgb)


def a_hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{round(_gamma(v) * 255):02X}" for v in rgb)


def girar(origen: str, giro: float, factor: float) -> str:
    big_l, c, h = hex_a_oklch(origen)
    c *= factor
    h = (h + giro) % 360
    while c > 0:
        rgb = oklch_a_rgb(big_l, c, h)
        if rgb is not None:
            return a_hex(rgb)
        c -= 0.002
    return a_hex(oklch_a_rgb(big_l, 0, h))  # type: ignore[arg-type]


def luminancia(h: str) -> float:
    r, g, b = (_lineal(int(h[i : i + 2], 16) / 255) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: str, b: str) -> float:
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


# Los tonos del primer pliegue de la tienda en la paleta original.
HERO = {"b": "#004C56", "oa": "#0B3A3F", "ob": "#072A2E"}


def _giro(clave: str) -> tuple[float, float]:
    _, giro, factor = PALETAS[clave]
    return giro, factor


def escala(clave: str) -> dict[int, str]:
    if clave == "turquesa":
        return TURQUESA
    _, giro, factor = PALETAS[clave]
    return {n: girar(TURQUESA[n], giro, factor) for n in ESCALONES}


def triplete(h: str) -> str:
    return " ".join(str(int(h[i : i + 2], 16)) for i in (1, 3, 5))


def css() -> str:
    lineas = []
    for clave in ("turquesa", *PALETAS):
        e = escala(clave)
        selector = ":root" if clave == "turquesa" else f"html[data-marca='{clave}']"
        cuerpo = " ".join(f"--brand-{n}: {triplete(e[n])};" for n in ESCALONES)
        # El primer pliegue: baja del 600 del encabezado a un tono más hondo; en oscuro, de un verde
        # de noche a otro más oscuro. Se giran igual que la escala para que cambien con la marca.
        hero = {
            "hero-a": e[600],
            "hero-b": HERO["b"] if clave == "turquesa" else girar(HERO["b"], *_giro(clave)),
            "hero-oscuro-a": HERO["oa"]
            if clave == "turquesa"
            else girar(HERO["oa"], *_giro(clave)),
            "hero-oscuro-b": HERO["ob"]
            if clave == "turquesa"
            else girar(HERO["ob"], *_giro(clave)),
        }
        extra = "".join(f" --{k}: {triplete(v)};" for k, v in hero.items())
        lineas.append(f"{selector} {{ {cuerpo}{extra} }}")
    return "\n".join(lineas)


def comprobar() -> None:
    for clave in ("turquesa", *PALETAS):
        e = escala(clave)
        blanco_600 = contraste("#FFFFFF", e[600])
        sobre_blanco_700 = contraste(e[700], "#FFFFFF")
        claro_300_en_950 = contraste(e[300], e[950])
        assert blanco_600 >= 4.5, (clave, "blanco sobre 600", blanco_600)
        assert sobre_blanco_700 >= 4.5, (clave, "700 sobre blanco", sobre_blanco_700)
        assert claro_300_en_950 >= 4.5, (clave, "300 sobre 950", claro_300_en_950)


if __name__ == "__main__":
    comprobar()
    print(css())
    print()
    for clave in ("turquesa", *PALETAS):
        e = escala(clave)
        print(clave, "600:", e[600], "| blanco/600:", round(contraste("#FFFFFF", e[600]), 2))
