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
