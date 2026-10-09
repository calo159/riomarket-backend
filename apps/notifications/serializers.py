"""Serializer de notificaciones (solo lectura; se crean desde los services)."""

from rest_framework import serializers

from apps.notifications.models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = (
            "id",
            "id_usuario",
            "id_pedido",
            "tipo",
            "titulo",
            "mensaje",
            "leida",
            "fecha_creacion",
            "fecha_lectura",
        )
        read_only_fields = fields
