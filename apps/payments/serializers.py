"""Serializers del módulo de pagos.

Solo validan forma. Las reglas (montos, permisos, transiciones) viven en
``apps.payments.services``. La información interna (comisión, neto del
vendedor y ``datos_sandbox``) se expone según el rol del solicitante.
"""

from rest_framework import serializers

from apps.orders.models import Pedido
from apps.payments.models import Pago


class PagoSerializer(serializers.ModelSerializer):
    """Vista del comprador: montos que paga, sin datos internos de plataforma."""

    class Meta:
        model = Pago
        fields = (
            "id",
            "id_pedido",
            "metodo_pago",
            "estado",
            "subtotal_pedido",
            "tarifa_domicilio_aplicada",
            "descuento_aplicado",
            "total_cobrado",
            "referencia_gateway",
            "notas",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_aprobacion",
            "fecha_reembolso",
        )
        read_only_fields = fields


class PagoVendedorSerializer(PagoSerializer):
    """Añade la comisión y el neto que recibe el vendedor."""

    neto_vendedor = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta(PagoSerializer.Meta):
        fields = (*PagoSerializer.Meta.fields, "comision_plataforma", "neto_vendedor")
        read_only_fields = fields


class PagoAdminSerializer(PagoVendedorSerializer):
    """Añade los datos internos de la pasarela (solo administradores)."""

    class Meta(PagoVendedorSerializer.Meta):
        fields = (*PagoVendedorSerializer.Meta.fields, "datos_sandbox")
        read_only_fields = fields


class CrearPagoSerializer(serializers.Serializer):
    pedido = serializers.PrimaryKeyRelatedField(queryset=Pedido.objects.all())
    metodo_pago = serializers.ChoiceField(choices=Pago.MetodoPago.choices, required=False)
    notas = serializers.CharField(required=False, allow_blank=True)


class SimularPagoSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(
        choices=["aprobar", "rechazar"], required=False, default="aprobar"
    )
    referencia_gateway = serializers.CharField(required=False, allow_blank=True)
    notas = serializers.CharField(required=False, allow_blank=True)


class ConfirmarEfectivoSerializer(serializers.Serializer):
    notas = serializers.CharField(required=False, allow_blank=True)


class ReembolsarPagoSerializer(serializers.Serializer):
    notas = serializers.CharField(required=False, allow_blank=True)


class AnularPagoSerializer(serializers.Serializer):
    notas = serializers.CharField(required=False, allow_blank=True)
