"""Serializers del módulo de pagos.

Solo validan forma. Las reglas (montos, permisos, transiciones) viven en
``apps.payments.services``. La información interna (comisión, neto del
vendedor y ``datos_sandbox``) se expone según el rol del solicitante.
"""

from rest_framework import serializers

from apps.orders.models import Pedido
from apps.payments.models import LiquidacionComision, Pago


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


class ComisionSerializer(serializers.Serializer):
    """La cuenta de comisión de un vendedor (ADR-019). Solo lectura."""

    id_vendedor = serializers.IntegerField(read_only=True)
    vendedor = serializers.CharField(read_only=True)
    pagos_en_efectivo = serializers.IntegerField(read_only=True)
    cobrado_en_efectivo = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    comision_generada = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    comision_pagada = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    comision_pendiente = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
        help_text="Lo que el vendedor todavía debe. Negativo = saldo a favor.",
    )
    ultimo_pago = serializers.DateTimeField(read_only=True, allow_null=True)
    estado = serializers.ChoiceField(
        choices=["al_dia", "aviso", "bloqueado"],
        read_only=True,
        help_text="bloqueado: sus puestos no reciben pedidos nuevos hasta que pague (ADR-020).",
    )
    limite_aviso = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    limite_bloqueo = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    pagar_para_reactivar = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
        help_text="Cuánto falta pagar para volver a recibir pedidos (0 si no está bloqueado).",
    )


class LiquidacionSerializer(serializers.ModelSerializer):
    vendedor = serializers.CharField(source="id_vendedor.nombre", read_only=True)
    registrada_por_nombre = serializers.CharField(source="registrada_por.nombre", read_only=True)

    class Meta:
        model = LiquidacionComision
        fields = (
            "id",
            "id_vendedor",
            "vendedor",
            "monto",
            "nota",
            "registrada_por_nombre",
            "fecha_creacion",
        )
        read_only_fields = fields


class CrearLiquidacionSerializer(serializers.Serializer):
    id_vendedor = serializers.IntegerField(min_value=1)
    monto = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    nota = serializers.CharField(required=False, allow_blank=True, max_length=200)
