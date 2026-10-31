"""Observabilidad mínima (ADR-015): identificador de petición, registro de acceso y JSON.

Sin dependencias externas. Regla de oro: en los registros no entra nada personal ni secreto.
El registro de acceso lleva solo método, ruta (sin query string), estado, duración, el número
de usuario y el identificador de la petición; jamás cuerpo, cabeceras, cookies ni correos.
"""

import json
import logging
import re
import time
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime

from django.utils.functional import SimpleLazyObject, empty

# Identificador de la petición en curso (visible para cualquier registro de esa petición).
request_id_actual: ContextVar[str | None] = ContextVar("request_id_actual", default=None)

CABECERA = "X-Request-ID"
# Formato acotado: evita inyección de saltos de línea en cabeceras y registros.
_ID_VALIDO = re.compile(r"[A-Za-z0-9-]{8,64}")
_RUTAS_SIN_ACCESO = ("/api/health/", "/assets/")

acceso = logging.getLogger("apps.acceso")


def _id_de_la_peticion(request) -> str:
    entrante = request.META.get("HTTP_X_REQUEST_ID", "")
    if _ID_VALIDO.fullmatch(entrante):
        return entrante
    return uuid.uuid4().hex


def _usuario_id(request):
    """Número del usuario autenticado, sin provocar consultas ni leer más datos."""
    usuario = request.__dict__.get("user")
    if usuario is None:
        return None
    if isinstance(usuario, SimpleLazyObject) and usuario._wrapped is empty:
        return None  # nadie lo resolvió: no se hace una consulta solo para registrar
    if not getattr(usuario, "is_authenticated", False):
        return None
    pk = getattr(usuario, "pk", None)
    return pk if isinstance(pk, int) else None


class RequestIdMiddleware:
    """Asigna ``X-Request-ID`` a cada petición y deja un registro de acceso de una línea."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = _id_de_la_peticion(request)
        request.request_id = request_id
        token = request_id_actual.set(request_id)
        inicio = time.perf_counter()
        estado = 500
        try:
            respuesta = self.get_response(request)
            estado = respuesta.status_code
            respuesta[CABECERA] = request_id
            return respuesta
        finally:
            try:
                self._registrar_acceso(request, request_id, estado, inicio)
            finally:
                request_id_actual.reset(token)

    @staticmethod
    def _registrar_acceso(request, request_id, estado, inicio):
        ruta = request.path
        if ruta.startswith(_RUTAS_SIN_ACCESO) or not acceso.isEnabledFor(logging.INFO):
            return
        acceso.info(
            "%s %s %s",
            request.method,
            ruta[:200],
            estado,
            extra={
                "metodo": request.method,
                "ruta": ruta[:200],
                "estado": estado,
                "duracion_ms": int((time.perf_counter() - inicio) * 1000),
                "usuario_id": _usuario_id(request),
                "request_id": request_id,
            },
        )


class RequestIdFilter(logging.Filter):
    """Agrega ``record.request_id`` (o ``-``) para cualquier formateador."""

    def filter(self, record):
        if not getattr(record, "request_id", None):
            record.request_id = request_id_actual.get() or "-"
        return True


_PATRONES_SECRETOS = (
    re.compile(r"eyJ[\w-]+\.[\w-]+\.[\w-]+"),  # JWT
    re.compile(r"(?i)(password|contrase[ñn]a|passwd)\s*[=:]\s*\S+"),
)


def redactar(texto: str) -> str:
    texto = _PATRONES_SECRETOS[0].sub("[oculto]", texto)
    return _PATRONES_SECRETOS[1].sub(lambda m: f"{m.group(1)}=[oculto]", texto)


class RedactarSecretos(logging.Filter):
    """Defensa en profundidad: oculta JWT y contraseñas que se cuelen en un mensaje."""

    def filter(self, record):
        record.msg = redactar(record.getMessage())
        record.args = None
        return True


# Lista blanca: nunca se vuelca ``record.__dict__`` (podría arrastrar ``request`` o cabeceras).
CAMPOS_PERMITIDOS = (
    "metodo",
    "ruta",
    "estado",
    "duracion_ms",
    "usuario_id",
    "pedido_id",
    "cancelados",
    "omitidos",
)


class JsonFormatter(logging.Formatter):
    """Una línea JSON por registro, con campos de una lista blanca."""

    def format(self, record):
        datos = {
            "ts": datetime.fromtimestamp(record.created, UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
            + "Z",
            "nivel": record.levelname,
            "logger": record.name,
            "msg": redactar(record.getMessage()),
            "request_id": getattr(record, "request_id", None) or request_id_actual.get() or "-",
        }
        for campo in CAMPOS_PERMITIDOS:
            if hasattr(record, campo):
                datos[campo] = getattr(record, campo)
        if record.exc_info:
            datos["error"] = redactar(self.formatException(record.exc_info))
        return json.dumps(datos, ensure_ascii=False, default=str)
