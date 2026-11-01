"""Vistas comunes: la salud del servicio."""

import os
import re
import time
from datetime import UTC, datetime

from django.conf import settings
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
from django.http import JsonResponse
from django.views import View

# Resultado cacheado de «¿hay migraciones pendientes?»: cargar el grafo de migraciones cuesta
# decenas de ms y Render llama a /api/health/ cada pocos segundos.
_MIGRACIONES: dict = {"valor": None, "hasta": 0.0}
_MIGRACIONES_TTL_S = 600
_COMMIT_VALIDO = re.compile(r"[0-9a-f]{7,40}")


def _hay_migraciones_pendientes() -> bool:
    ejecutor = MigrationExecutor(connections["default"])
    return bool(ejecutor.migration_plan(ejecutor.loader.graph.leaf_nodes()))


def _estado_migraciones() -> str:
    """``al_dia``, ``pendientes`` o ``desconocido`` (nunca falla ni expone el error)."""
    ahora = time.monotonic()
    if _MIGRACIONES["valor"] is None or ahora >= _MIGRACIONES["hasta"]:
        try:
            pendientes = _hay_migraciones_pendientes()
            _MIGRACIONES["valor"] = "pendientes" if pendientes else "al_dia"
        except Exception:
            _MIGRACIONES["valor"] = "desconocido"
        _MIGRACIONES["hasta"] = ahora + _MIGRACIONES_TTL_S
    return _MIGRACIONES["valor"]


def _version() -> str:
    commit = os.environ.get("RENDER_GIT_COMMIT", "").strip().lower()
    return commit[:7] if _COMMIT_VALIDO.fullmatch(commit) else "desconocida"


def _almacenamiento_externo() -> bool:
    backend = settings.STORAGES.get("default", {}).get("BACKEND", "")
    return "s3" in backend.lower()


class HealthCheckView(View):
    """Salud del servicio. Público: no revela secretos, rutas, versiones de librerías ni errores.

    Responde 503 solo si la base está caída (Render reinicia con 503 repetidos); el resto de los
    campos son informativos. ``debug`` y los nombres de variables no se exponen a propósito.
    """

    def get(self, request):
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
            db_status = "up"
        except Exception:
            db_status = "down"
        return JsonResponse(
            {
                "status": "ok" if db_status == "up" else "degraded",
                "database": db_status,
                "version": _version(),
                "migraciones": _estado_migraciones() if db_status == "up" else "desconocido",
                "almacenamiento_externo": _almacenamiento_externo(),
                "hora_servidor": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            status=200 if db_status == "up" else 503,
        )
