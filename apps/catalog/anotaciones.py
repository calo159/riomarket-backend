"""Anotaciones del catálogo que dependen de datos de otras apps.

El catálogo muestra la reputación de los puestos, pero las reseñas viven en ``reviews``, que depende
del catálogo y no al revés. Por eso el catálogo solo define el punto de extensión y ``reviews``
registra sus anotadores al arrancar (``ReviewsConfig.ready``). Sin anotador registrado, la consulta
queda igual.
"""

from collections.abc import Callable

from django.db.models import QuerySet

REPUTACION = "reputacion"  # Puesto: calificacion_promedio y cantidad_resenas
CALIFICACION_DEL_PUESTO = "calificacion_del_puesto"  # Producto: puesto_calificacion

_ANOTADORES: dict[str, Callable[[QuerySet], QuerySet]] = {}


def registrar_anotador(nombre: str, anotador: Callable[[QuerySet], QuerySet]) -> None:
    """Asocia ``nombre`` con una función que recibe y devuelve un queryset (idempotente)."""
    _ANOTADORES[nombre] = anotador


def anotar(nombre: str, queryset: QuerySet) -> QuerySet:
    anotador = _ANOTADORES.get(nombre)
    return anotador(queryset) if anotador else queryset
