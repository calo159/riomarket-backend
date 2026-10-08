"""Vistas compartidas (health check)."""

from django.conf import settings
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.serializers import HealthSerializer


class HealthCheckView(APIView):
    """Endpoint de salud para Docker/monitoreo: ``GET /api/health/``."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    serializer_class = HealthSerializer

    def get(self, request):
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False
        status = 200 if db_ok else 503
        return Response(
            {
                "status": "ok" if db_ok else "degraded",
                "database": "up" if db_ok else "down",
                "debug": settings.DEBUG,
            },
            status=status,
        )
