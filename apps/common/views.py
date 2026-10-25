"""Vistas comunes."""

from django.conf import settings
from django.db import connections
from django.http import FileResponse, Http404, JsonResponse
from django.views import View


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
