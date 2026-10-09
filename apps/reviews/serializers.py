"""Serializers de reseñas. Las reglas (pedido entregado, única por puesto,
respuesta del vendedor) viven en ``apps.reviews.services``."""

from rest_framework import serializers

from apps.orders.models import Pedido
from apps.reviews.models import Resena


class ResenaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="id_usuario.nombre", read_only=True)

    class Meta:
        model = Resena
        fields = (
            "id",
            "id_usuario",
            "id_puesto",
            "id_pedido",
            "calificacion",
            "comentario",
            "respuesta",
            "fecha_respuesta",
            "visible",
            "usuario_nombre",
            "fecha_creacion",
            "fecha_actualizacion",
        )
        read_only_fields = (
            "id",
            "id_usuario",
            "id_pedido",
            "respuesta",
            "fecha_respuesta",
            "visible",
            "usuario_nombre",
            "fecha_creacion",
            "fecha_actualizacion",
        )


class ResenaEscrituraSerializer(serializers.ModelSerializer):
    id_pedido = serializers.PrimaryKeyRelatedField(
        queryset=Pedido.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Resena
        fields = ("id_puesto", "id_pedido", "calificacion", "comentario")


class RespuestaSerializer(serializers.Serializer):
    respuesta = serializers.CharField()
