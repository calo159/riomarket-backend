"""Lectura con caché corta de los valores fijados en el panel.

Cada petición de compra pregunta varias veces por la comisión y la tarifa; ir a la base cada vez
sería una consulta de más en el camino más caliente. Los valores viven unos segundos en memoria del
proceso (``AJUSTES_CACHE_SEGUNDOS``) y se descartan al guardar, así que en el proceso que guarda el
cambio se ve al instante y en otros procesos tarda como mucho esos segundos.
"""

import logging
import time

from django.conf import settings
from django.db import DatabaseError

from apps.configuracion.campos import POR_CLAVE
from apps.configuracion.models import ConfiguracionPlataforma, PersonalizacionSitio
from apps.configuracion.sitio import DEFECTOS, resolver_defectos

logger = logging.getLogger(__name__)

_estado: dict = {"valores": None, "vence": 0.0}


def invalidar() -> None:
    _estado["valores"] = None
    _estado["vence"] = 0.0


def fijados() -> dict:
    """``{nombre del ajuste en settings: Decimal}`` de lo que el panel fijó (vacío si nada)."""
    ahora = time.monotonic()
    if _estado["valores"] is None or ahora >= _estado["vence"]:
        try:
            fila = ConfiguracionPlataforma.objects.filter(pk=1).first()
            valores = {}
            if fila is not None:
                for clave, campo in POR_CLAVE.items():
                    dato = getattr(fila, clave)
                    if dato is not None:
                        valores[campo.ajuste] = dato
        except DatabaseError:
            # Tabla aún sin migrar o base caída: se sigue con lo que ya había (o con settings).
            logger.exception("No se pudo leer la configuración de la plataforma")
            valores = _estado["valores"] or {}
        _estado["valores"] = valores
        _estado["vence"] = ahora + settings.AJUSTES_CACHE_SEGUNDOS
    return _estado["valores"]


_sitio: dict = {"valores": None, "vence": 0.0}


def invalidar_sitio() -> None:
    _sitio["valores"] = None
    _sitio["vence"] = 0.0


def sitio() -> dict:
    """La identidad del sitio: lo que fijó el panel y, donde no hay nada, el valor de por defecto.

    Con ``AJUSTES_EN_BASE_DE_DATOS`` apagado (las pruebas) siempre devuelve los de por defecto.
    """
    if not settings.AJUSTES_EN_BASE_DE_DATOS:
        return dict(DEFECTOS)
    ahora = time.monotonic()
    if _sitio["valores"] is None or ahora >= _sitio["vence"]:
        valores = dict(DEFECTOS)
        try:
            fila = PersonalizacionSitio.objects.filter(pk=1).first()
            if fila is not None:
                propios = {clave: getattr(fila, clave) for clave in DEFECTOS}
                valores = resolver_defectos(propios)
                for clave, dato in propios.items():
                    if dato:
                        valores[clave] = dato
        except DatabaseError:
            logger.exception("No se pudo leer la personalización del sitio")
            valores = _sitio["valores"] or valores
        _sitio["valores"] = valores
        _sitio["vence"] = ahora + settings.AJUSTES_CACHE_SEGUNDOS
    return dict(_sitio["valores"])


def proveedor_marca(clave: str, defecto: str = "") -> str:
    """Gancho de ``apps.common.marca``: el valor vigente de un dato del sitio."""
    return sitio().get(clave, defecto)


def proveedor(nombre: str):
    """Gancho de ``apps.common.ajustes``: el valor del panel para ese ajuste, o ``None``."""
    if not settings.AJUSTES_EN_BASE_DE_DATOS:
        return None
    return fijados().get(nombre)
