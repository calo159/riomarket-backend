"""Serializers del módulo de pagos."""

from rest_framework import serializers

from apps.payments.models import Pago


class PagoSerializer(serializers.ModelSerializer):
    id_pedido = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Pago
        fields = (
            "id",
            "id_pedido",
            "metodo_pago",
            "estado",
            "subtotal_pedido",
            "tarifa_domicilio_aplicada",
            "comision_plataforma",
            "total_cobrado",
            "referencia_gateway",
            "datos_sandbox",
            "notas",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_aprobacion",
        )
        read_only_fields = (
            "id",
            "id_pedido",
            "estado",
            "subtotal_pedido",
            "tarifa_domicilio_aplicada",
            "comision_plataforma",
            "total_cobrado",
            "referencia_gateway",
            "datos_sandbox",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_aprobacion",
        )


class CrearPagoSerializer(serializers.Serializer):
    metodo_pago = serializers.ChoiceField(
        choices=Pago.MetodoPago.choices, required=False, default=Pago.MetodoPago.SIMULADO
    )
    notas = serializers.CharField(required=False, allow_blank=True)


class SimularPagoSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(
        choices=["aprobar", "rechazar"], required=False, default="aprobar"
    )
    referencia_gateway = serializers.CharField(required=False, allow_blank=True)
    notas = serializers.CharField(required=False, allow_blank=True)
