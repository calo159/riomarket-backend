"""Serializers compartidos."""

from rest_framework import serializers


class HealthSerializer(serializers.Serializer):
    """Respuesta de ``GET /api/health/``."""

    status = serializers.CharField(help_text="ok | degraded")
    database = serializers.CharField(help_text="up | down")
    debug = serializers.BooleanField(help_text="Modo DEBUG del entorno")
