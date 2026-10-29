"""Serializers de los pedidos.

Solo validan forma (campos obligatorios, cantidades); las reglas de negocio
4 y 5 (stock, un solo puesto, máquina de estados) viven en
``apps.orders.services``. Los montos son de solo lectura: los calcula el
servidor, nunca llegan del cliente.
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.orders import services
from apps.orders.models import ItemPedido, Pedido


class ItemPedidoSerializer(serializers.ModelSerializer):
    """Línea de pedido: el cliente envía producto + cantidad.

    Nombre, precio y subtotal son de solo lectura (snapshot congelado por el
    servidor al crear el pedido).
    """

    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ItemPedido
        fields = (
            "id",
            "id_producto",
            "nombre_producto",
            "unidad_medida",
            "precio_unitario",
            "cantidad",
            "subtotal",
        )
        read_only_fields = ("id", "nombre_producto", "unidad_medida", "precio_unitario")


class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True, allow_empty=False)
    codigo_cupon = serializers.CharField(write_only=True, required=False, allow_blank=True)
    acciones_permitidas = serializers.SerializerMethodField(
        help_text=(
            "Acciones que el usuario autenticado puede ejecutar ahora sobre este pedido "
            "(RBAC + estado): confirmar, en-preparacion, enviar, entregar, no-recibido, "
            "cancelar, editar."
        )
    )

    class Meta:
        model = Pedido
        fields = (
            "id",
            "id_comprador",
            "id_puesto",
            "tipo_entrega",
            "estado",
            "direccion_entrega",
            "referencia_entrega",
            "id_direccion",
            "latitud_entrega",
            "longitud_entrega",
            "notas",
            "no_recibido_en",
            "motivo_no_recibido",
            "subtotal",
            "tarifa_domicilio",
            "id_cupon",
            "descuento_cupon",
            "total",
            "items",
            "codigo_cupon",
            "acciones_permitidas",
            "fecha_creacion",
            "fecha_actualizacion",
        )
        read_only_fields = (
            "id",
            "id_comprador",
            "estado",
            "latitud_entrega",
            "longitud_entrega",
            "no_recibido_en",
            "motivo_no_recibido",
            "subtotal",
            "tarifa_domicilio",
            "id_cupon",
            "descuento_cupon",
            "total",
            "fecha_creacion",
            "fecha_actualizacion",
        )

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_acciones_permitidas(self, pedido) -> list[str]:
        request = self.context.get("request")
        usuario = getattr(request, "user", None)
        return services.acciones_disponibles(pedido, usuario)

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        return services.crear_pedido(
            usuario=self.context["request"].user, datos={**validated_data, "items": items}
        )

    def update(self, instance, validated_data):
        # Los ítems no se editan: un pedido pendiente solo cambia dirección,
        # referencia y notas (regla 4: precios y líneas quedan congelados).
        validated_data.pop("items", None)
        return services.actualizar_pedido(
            pedido=instance,
            usuario=self.context["request"].user,
            datos=validated_data,
        )
