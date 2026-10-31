"""Vistas comunes."""

from django.conf import settings
from django.db import connections
from django.http import FileResponse, Http404, JsonResponse
from django.views import View
from django.views.static import serve as servir_archivo


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


class FrontendCatchAllView(View):
    def get(self, request, *args, **kwargs):
        index_path = settings.BASE_DIR / "frontend" / "dist" / "index.html"
        if not index_path.exists():
            raise Http404("Frontend no construido")
        return FileResponse(open(index_path, "rb"), content_type="text/html")


class ArchivoFrontendView(View):
    """Entrega un archivo real del build (service worker, manifest, íconos, página sin conexión).

    La ruta solo acepta nombres de una lista fija (ver ``config/urls.py``). Si el archivo no
    existe responde 404: nunca ``index.html`` con 200, que el navegador tomaría por un
    ``sw.js`` o un manifest inválidos.
    """

    def get(self, request, path):
        raiz = settings.BASE_DIR / "frontend" / "dist"
        return servir_archivo(request, path, document_root=raiz)
