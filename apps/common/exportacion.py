"""Exportación a CSV que Excel abre bien y que no ejecuta fórmulas.

Dos cuidados que importan en una exportación de datos de usuarios:

- **Inyección de fórmulas.** Una celda de texto que empieza con ``=``, ``+``, ``-`` o ``@`` se
  interpreta como fórmula al abrir el archivo en Excel o Sheets (un nombre de usuario malicioso
  podría ejecutar algo en el computador de quien exporta). Se les antepone una comilla simple.
  Los números (``int``, ``Decimal``) no se tocan: un ``-200`` es un monto, no una fórmula.
- **Tildes.** Se escribe la marca de orden de bytes UTF-8 para que Excel no rompa «Gómez».

Un tope de filas evita que una exportación enorme consuma la memoria del servidor gratuito.
"""

import codecs
import csv
from collections.abc import Iterable
from datetime import date, datetime
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone

LIMITE_FILAS = 20_000
_INICIOS_DE_FORMULA = ("=", "+", "-", "@", "\t", "\r")


def celda(valor) -> str:
    """Texto seguro para una celda de CSV."""
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "sí" if valor else "no"
    if isinstance(valor, (int, Decimal)):
        return str(valor)
    if isinstance(valor, datetime):
        if timezone.is_aware(valor):
            valor = timezone.localtime(valor)
        return valor.strftime("%Y-%m-%d %H:%M")
    if isinstance(valor, date):
        return valor.isoformat()
    texto = str(valor)
    if texto.startswith(_INICIOS_DE_FORMULA):
        return "'" + texto
    return texto


def respuesta_csv(
    nombre: str, cabeceras: list[str], filas: Iterable, limite: int | None = None
) -> HttpResponse:
    """Arma la descarga; ``X-Total-Filas`` dice cuántas filas salieron y ``X-Exportacion-Truncada``
    avisa si se cortó en el tope."""
    limite = LIMITE_FILAS if limite is None else limite
    hoy = timezone.localdate()
    respuesta = HttpResponse(content_type="text/csv; charset=utf-8")
    respuesta["Content-Disposition"] = f'attachment; filename="{nombre}-{hoy:%Y%m%d}.csv"'
    respuesta.write(codecs.BOM_UTF8)
    escritor = csv.writer(respuesta)
    escritor.writerow([celda(c) for c in cabeceras])
    total = 0
    for fila in filas:
        if total >= limite:
            respuesta["X-Exportacion-Truncada"] = "1"
            break
        escritor.writerow([celda(v) for v in fila])
        total += 1
    respuesta["X-Total-Filas"] = str(total)
    return respuesta
