"""Serializers de cupones."""

from rest_framework import serializers

from apps.promotions.models import Cupon


class CuponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cupon
        fields = (
            "id",
            "codigo",
            "id_puesto",
            "tipo_descuento",
            "valor",
            "monto_minimo_pedido",
            "tope_descuento",
            "usos_totales",
            "usos_por_usuario",
            "fecha_inicio",
            "fecha_fin",
            "activo",
            "fecha_creacion",
        )
        read_only_fields = ("id", "fecha_creacion")


class ValidarCuponSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    id_puesto = serializers.IntegerField()
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)


class ValidarCuponResponse(serializers.Serializer):
    codigo = serializers.CharField()
    tipo_descuento = serializers.CharField()
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    descuento = serializers.DecimalField(max_digits=12, decimal_places=2)
