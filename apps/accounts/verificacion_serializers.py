"""Serializers de verificación de identidad de vendedores.

Los datos sensibles (número y foto de cédula) son write-only: la API nunca los
expone de vuelta. Las reglas de negocio viven en ``services.py`` (regla 6,
cifrado en reposo y validación de imagen).
"""

from rest_framework import serializers

from apps.accounts import services
from apps.accounts.models import Vendedor

NUMERO_CEDULA_MAX = 20


class SolicitudVerificacionSerializer(serializers.Serializer):
    """``numero_cedula`` + ``foto_cedula`` (multipart) para crear/reabrir."""

    numero_cedula = serializers.CharField(
        max_length=NUMERO_CEDULA_MAX,
        write_only=True,
        help_text="Número de documento: solo dígitos, espacios, puntos o guiones.",
    )
    foto_cedula = serializers.FileField(write_only=True)

    def validate_numero_cedula(self, value):
        if not all(ch.isdigit() or ch in " .-" for ch in value):
            raise serializers.ValidationError(
                "Usa solo dígitos, espacios, puntos o guiones en el número de cédula."
            )
        return value

    def create(self, validated_data):
        url = validated_data.pop("foto_cedula")
        return services.solicitar_verificacion(
            usuario=self.context["request"].user,
            numero_cedula=validated_data["numero_cedula"],
            foto=url,
        )


class MiVerificacionSerializer(serializers.ModelSerializer):
    """Estado de la propia solicitud (sin exponer datos de la cédula)."""

    class Meta:
        model = Vendedor
        fields = (
            "id",
            "estado_verificacion",
            "motivo_rechazo",
            "fecha_solicitud",
            "fecha_revision",
        )
        read_only_fields = fields


class VerificacionAdminListSerializer(serializers.ModelSerializer):
    """Fila de la cola de revisión: identifica al vendedor sin datos sensibles."""

    nombre_usuario = serializers.CharField(source="id_usuario.nombre", read_only=True)
    correo_usuario = serializers.CharField(source="id_usuario.correo", read_only=True)
    tiene_foto = serializers.SerializerMethodField()

    class Meta:
        model = Vendedor
        fields = (
            "id",
            "id_usuario",
            "nombre_usuario",
            "correo_usuario",
            "estado_verificacion",
            "motivo_rechazo",
            "fecha_solicitud",
            "fecha_revision",
            "id_revisor",
            "tiene_foto",
        )
        read_only_fields = fields

    def get_tiene_foto(self, obj) -> bool:
        return bool(obj.foto_cedula)


class DecidirVerificacionSerializer(serializers.Serializer):
    """Decisión del revisor: ``aprobado`` o ``rechazado`` (con motivo)."""

    estado = serializers.ChoiceField(
        choices=[
            (Vendedor.EstadoVerificacion.APROBADO, "aprobado"),
            (Vendedor.EstadoVerificacion.RECHAZADO, "rechazado"),
        ]
    )
    motivo_rechazo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Obligatorio cuando el estado es 'rechazado'.",
    )

    def validate(self, attrs):
        if (
            attrs["estado"] == Vendedor.EstadoVerificacion.RECHAZADO
            and not (attrs.get("motivo_rechazo") or "").strip()
        ):
            raise serializers.ValidationError(
                {"motivo_rechazo": "Indica el motivo del rechazo."}
            )
        return attrs

    def update(self, instance, validated_data):
        revisor = self.context["request"].user
        if validated_data["estado"] == Vendedor.EstadoVerificacion.APROBADO:
            return services.aprobar_verificacion(vendedor=instance, revisor=revisor)
        return services.rechazar_verificacion(
            vendedor=instance,
            revisor=revisor,
            motivo=validated_data.get("motivo_rechazo", ""),
        )
