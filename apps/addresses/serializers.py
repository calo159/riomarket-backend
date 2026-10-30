"""Serializers de direcciones. La lógica (predeterminada, permisos) va en services."""

from rest_framework import serializers

from apps.addresses.models import Direccion


class DireccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Direccion
        fields = (
            "id",
            "id_usuario",
            "alias",
            "direccion",
            "referencia",
            "latitud",
            "longitud",
            "es_predeterminada",
            "activa",
            "fecha_creacion",
            "fecha_actualizacion",
        )
        read_only_fields = ("id", "id_usuario", "fecha_creacion", "fecha_actualizacion")


class DireccionEscrituraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Direccion
        fields = (
            "alias",
            "direccion",
            "referencia",
            "latitud",
            "longitud",
            "es_predeterminada",
            "activa",
        )

    def validate_latitud(self, valor):
        if valor is not None and not -90 <= valor <= 90:
            raise serializers.ValidationError("La latitud debe estar entre -90 y 90.")
        return valor

    def validate_longitud(self, valor):
        if valor is not None and not -180 <= valor <= 180:
            raise serializers.ValidationError("La longitud debe estar entre -180 y 180.")
        return valor
