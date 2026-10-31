"""Vistas comunes."""

from django.conf import settings
from django.db import connections
from django.http import Http404, HttpResponse, JsonResponse
from django.utils.cache import patch_cache_control
from django.views import View
from django.views.static import serve as servir_archivo

from apps.common.seo import completar_index


class HealthCheckView(View):
    """Endpoint simple para verificaciones de salud."""

    def get(self, request):
        try:
            connections["default"].cursor().execute("SELECT 1")
            db_status = "up"
        except Exception:
            db_status = "down"
        return JsonResponse(
            {"status": "ok" if db_status == "up" else "degraded", "database": db_status},
            status=200 if db_status == "up" else 503,
        )


# index.html leído del disco, por ruta: (fecha de modificación, texto). Se relee si cambia.
_INDEX_EN_MEMORIA: dict[str, tuple[int, str]] = {}


def _leer_index(index_path) -> str:
    try:
        mtime = index_path.stat().st_mtime_ns
    except FileNotFoundError:
        raise Http404("Frontend no construido") from None
    guardado = _INDEX_EN_MEMORIA.get(str(index_path))
    if guardado is None or guardado[0] != mtime:
        guardado = (mtime, index_path.read_text(encoding="utf-8"))
        _INDEX_EN_MEMORIA[str(index_path)] = guardado
    return guardado[1]


class FrontendCatchAllView(View):
    """Entrega ``index.html`` con el origen y las metaetiquetas de la ruta ya resueltos.

    ``no-cache`` obliga a revalidar siempre: tras un despliegue el HTML apunta a los nuevos
    archivos con hash, y uno guardado apuntaría a archivos que ya no existen.
    """

    def get(self, request, *args, **kwargs):
        index_path = settings.BASE_DIR / "frontend" / "dist" / "index.html"
        html = completar_index(
            _leer_index(index_path),
            origen=f"{request.scheme}://{request.get_host()}",
            path=request.path,
        )
        respuesta = HttpResponse(html, content_type="text/html; charset=utf-8")
        patch_cache_control(respuesta, no_cache=True)
        return respuesta


class ArchivoFrontendView(View):
    """Entrega un archivo real del build (service worker, manifest, íconos, página sin conexión).

    La ruta solo acepta nombres de una lista fija (ver ``config/urls.py``). Si el archivo no
    existe responde 404: nunca ``index.html`` con 200, que el navegador tomaría por un
    ``sw.js`` o un manifest inválidos.
    """

    def get(self, request, path):
        raiz = settings.BASE_DIR / "frontend" / "dist"
        return servir_archivo(request, path, document_root=raiz)
