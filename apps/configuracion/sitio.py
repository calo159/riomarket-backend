"""La identidad y los textos del sitio que el administrador puede cambiar desde el panel (ADR-024).

Quien compra el proyecto lo vuelve suyo sin tocar código: el nombre de la marca, la ciudad, el
titular de la portada, el contacto, el pie de página y la paleta de color. Un campo vacío significa
«sin valor propio»: rige el de aquí (``defecto``), que es el de RioMarket en Riohacha.

Esta tabla es la única fuente: el servidor la usa para validar, la pantalla del panel se arma sola a
partir de ella y la tienda lee los valores ya mezclados con los de por defecto.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

TEXTO = "texto"
PARRAFO = "parrafo"
CORREO = "correo"
URL = "url"
TELEFONO = "telefono"
PALETA = "paleta"

# clave de la paleta: (etiqueta, color principal para la barra del navegador). Las escalas completas
# están en frontend/src/paletasMarca.css y se generan con scripts/generar_paletas_marca.py.
PALETAS = {
    "turquesa": ("Turquesa (la original)", "#00626D"),
    "azul": ("Azul mar", "#3A5781"),
    "verde": ("Verde selva", "#306345"),
    "ciruela": ("Ciruela", "#6C486A"),
    "pizarra": ("Pizarra", "#4E5763"),
}


@dataclass(frozen=True)
class CampoSitio:
    clave: str
    etiqueta: str
    ayuda: str
    grupo: str
    tipo: str
    largo: int
    defecto: str


CAMPOS = (
    CampoSitio(
        "nombre_marca",
        "Nombre de la marca",
        "Sale en el encabezado, el pie, el título de cada página, los correos y los mensajes.",
        "Marca",
        TEXTO,
        40,
        "RioMarket",
    ),
    CampoSitio(
        "ciudad",
        "Ciudad",
        "La ciudad donde opera el mercado. Sale en «Entregar en…» y en los títulos.",
        "Marca",
        TEXTO,
        60,
        "Riohacha",
    ),
    CampoSitio(
        "region",
        "Departamento y país",
        "Va junto a la ciudad en el pie de página.",
        "Marca",
        TEXTO,
        80,
        "La Guajira · Colombia",
    ),
    CampoSitio(
        "descripcion",
        "Descripción para buscadores y WhatsApp",
        "La frase que aparece al compartir el enlace y en los resultados de búsqueda.",
        "Marca",
        PARRAFO,
        200,
        "Compra en los puestos del mercado de {ciudad} desde el celular: "
        "a domicilio o para recoger.",
    ),
    CampoSitio(
        "color_marca",
        "Color de la marca",
        "Cambia el color del encabezado, los enlaces y la portada. "
        "Los colores de acción (comprar) no cambian.",
        "Marca",
        PALETA,
        20,
        "turquesa",
    ),
    CampoSitio(
        "titular_inicio",
        "Titular de la portada",
        "La primera parte del titular grande de la tienda.",
        "Portada",
        TEXTO,
        90,
        "Compra directo en los puestos de",
    ),
    CampoSitio(
        "titular_destacado",
        "Palabra destacada del titular",
        "Va en amarillo y subrayada con una ola, a continuación del titular.",
        "Portada",
        TEXTO,
        40,
        "{ciudad}",
    ),
    CampoSitio(
        "subtitulo_inicio",
        "Texto bajo el titular",
        "Dos líneas que explican cómo se compra.",
        "Portada",
        PARRAFO,
        240,
        "Cada pedido es de un solo puesto: sabes quién lo prepara y a quién preguntarle. "
        "A domicilio o para recoger.",
    ),
    CampoSitio(
        "correo_soporte",
        "Correo de soporte",
        "Se muestra en el pie de página. Vacío, no se muestra.",
        "Contacto",
        CORREO,
        120,
        "",
    ),
    CampoSitio(
        "whatsapp_soporte",
        "WhatsApp de soporte",
        "Con indicativo y solo números, por ejemplo 573001234567. Vacío, no se muestra.",
        "Contacto",
        TELEFONO,
        20,
        "",
    ),
    CampoSitio(
        "instagram_url",
        "Instagram",
        "Dirección completa del perfil, por ejemplo https://instagram.com/tumarca. "
        "Vacío, no se muestra.",
        "Contacto",
        URL,
        200,
        "",
    ),
    CampoSitio(
        "facebook_url",
        "Facebook",
        "Dirección completa de la página. Vacío, no se muestra.",
        "Contacto",
        URL,
        200,
        "",
    ),
    CampoSitio(
        "texto_pie",
        "Texto del pie de página",
        "La frase bajo el nombre en el pie de todas las páginas.",
        "Pie de página",
        PARRAFO,
        200,
        "El mercado de {ciudad} en línea. Compra directo a vendedores de tu ciudad.",
    ),
    CampoSitio(
        "nota_pagos",
        "Nota sobre los pagos",
        "La última línea del pie. Debe decir la verdad sobre cómo se paga en tu mercado.",
        "Pie de página",
        TEXTO,
        160,
        "Pagas en efectivo al recibir o al recoger.",
    ),
)

POR_CLAVE = {c.clave: c for c in CAMPOS}


def resolver_defectos(propios: dict[str, str] | None = None) -> dict[str, str]:
    """Los valores de por defecto con ``{ciudad}`` y ``{nombre_marca}`` ya puestos.

    Así, si el administrador cambia solo la ciudad, la descripción, el pie y la palabra destacada
    de la portada la siguen sin que tenga que reescribirlos.
    """
    propios = propios or {}
    datos = {
        "ciudad": propios.get("ciudad") or POR_CLAVE["ciudad"].defecto,
        "nombre_marca": propios.get("nombre_marca") or POR_CLAVE["nombre_marca"].defecto,
    }
    return {c.clave: c.defecto.format(**datos) for c in CAMPOS}


DEFECTOS = resolver_defectos()

_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_TELEFONO = re.compile(r"^\+?\d{10,15}$")
_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


def limpiar(campo: CampoSitio, bruto) -> str:
    """El valor ya validado del campo, o ``ValueError`` con el mensaje para el administrador."""
    texto = _CONTROL.sub("", str(bruto if bruto is not None else "")).strip()
    if campo.tipo != PARRAFO:
        texto = " ".join(texto.split())
    if not texto:
        return ""
    if len(texto) > campo.largo:
        raise ValueError(f"Máximo {campo.largo} caracteres (llevas {len(texto)}).")
    if "<" in texto or ">" in texto:
        raise ValueError("No puede llevar los signos < ni >.")
    if campo.tipo == CORREO and not _CORREO.match(texto):
        raise ValueError("Escribe un correo válido, por ejemplo hola@tumarca.com.")
    if campo.tipo == TELEFONO:
        texto = texto.replace(" ", "").replace("-", "")
        if not _TELEFONO.match(texto):
            raise ValueError("Solo números, con indicativo (10 a 15 dígitos).")
    if campo.tipo == URL and not re.match(r"^https://[^\s/]+\.[^\s/]+(/\S*)?$", texto):
        raise ValueError("Escribe la dirección completa, que empiece por https://")
    if campo.tipo == PALETA and texto not in PALETAS:
        raise ValueError("Elige uno de los colores de la lista.")
    return texto
