"""Serializers de autenticación y perfil.

Solo formato/captura aquí; las reglas de negocio viven en ``services.py``:
rol no administrable, unicidad de correo/celular, fortaleza de contraseña y
normalización (deduplicación de "  Pepe@Mail.COM " y "+57 300...").
"""

import re

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts import services
from apps.accounts.models import Usuario

# Dígitos, espacios, +, (), - y . (los separadores se normalizan al guardar).
CELULAR_PATRON = re.compile(r"^[\d\s()+\-.]+$")


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        style={"input_type": "password"},
    )
    rol = serializers.ChoiceField(
        choices=[(Usuario.Rol.COMPRADOR, "comprador"), (Usuario.Rol.VENDEDOR, "vendedor")]
    )

    class Meta:
        model = Usuario
        fields = ("id", "nombre", "correo", "celular", "rol", "password")
        read_only_fields = ("id",)

    def validate_celular(self, value):
        if not CELULAR_PATRON.match(value):
            raise serializers.ValidationError("Usa solo dígitos, espacios, +, (), - o .")
        return value

    def create(self, validated_data):
        return services.registrar_usuario(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """Igual que el login JWT estándar, agregando los datos del usuario."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["rol"] = user.rol
        token["nombre"] = user.nombre
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["usuario"] = {
            "id": self.user.id,
            "nombre": self.user.nombre,
            "correo": self.user.correo,
            "celular": self.user.celular,
            "rol": self.user.rol,
            "estado": self.user.estado,
        }
        return data


class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ("id", "nombre", "correo", "celular", "rol", "estado", "fecha_registro")
        read_only_fields = ("id", "rol", "estado", "fecha_registro")

    def validate_celular(self, value):
        if not CELULAR_PATRON.match(value):
            raise serializers.ValidationError("Usa solo dígitos, espacios, +, (), - o .")
        return value

    def update(self, instance, validated_data):
        return services.actualizar_perfil(usuario=instance, datos=validated_data)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        write_only=True,
        help_text="Token de refresco que se revoca (blacklist).",
    )
