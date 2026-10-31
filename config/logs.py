"""Configuración de ``LOGGING`` compartida por los entornos (ADR-015).

``formato="texto"`` (desarrollo y pruebas) conserva el formato legible de siempre;
``formato="json"`` (producción) emite una línea JSON por registro con ``request_id``.
"""


def construir_logging(formato: str, debug: bool, nivel: str) -> dict:
    manejador = "json" if formato == "json" else "verbose"
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {"()": "apps.common.observabilidad.RequestIdFilter"},
            "redactar": {"()": "apps.common.observabilidad.RedactarSecretos"},
        },
        "formatters": {
            "verbose": {"format": "{levelname} {asctime} {module} {message}", "style": "{"},
            "json": {"()": "apps.common.observabilidad.JsonFormatter"},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": manejador,
                "filters": ["request_id", "redactar"],
            },
        },
        "root": {"handlers": ["console"], "level": nivel},
        "loggers": {
            "django": {"level": "INFO", "propagate": True},
            "apps": {"level": "DEBUG" if debug else "INFO", "propagate": True},
            "apps.acceso": {"level": "INFO", "propagate": True},
        },
    }
