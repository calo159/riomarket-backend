"""Serializers de los pedidos.

Solo validan forma (campos obligatorios, cantidades); las reglas de negocio
4 y 5 (stock, un solo puesto, máquina de estados) viven en
``apps.orders.services``. Los montos son de solo lectura: los calcula el
servidor, nunca llegan del cliente.
"""

from rest_framework import serializers

from apps.catalog.models import Producto
from apps.orders import services
from apps.orders.models import ItemPedido, Pedido

MAX_LINEAS_POR_PEDIDO = 50


class ProductoPorId(serializers.PrimaryKeyRelatedField):
    """Recibe el id del producto sin consultarlo: ``crear_pedido`` los trae todos de una vez.

    El campo por defecto hace un SELECT por línea (y 300 líneas inventadas costaban 300
    consultas antes del 400).
    """

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, int | str):
            self.fail("incorrect_type", data_type=type(data).__name__)
        try:
            return int(data)
        except ValueError:
            self.fail("incorrect_type", data_type=type(data).__name__)


class ItemPedidoSerializer(serializers.ModelSerializer):
    """Línea de pedido: el cliente envía producto + cantidad.

    Nombre, precio y subtotal son de solo lectura (snapshot congelado por el
    servidor al crear el pedido).
    """

    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    id_producto = ProductoPorId(queryset=Producto.objects.all())
    detalles = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=300,
        help_text="Solo para productos por encargo: sabor, mensaje, etc. (máximo 300).",
    )

    class Meta:
        model = ItemPedido
        fields = (
            "id",
            "id_producto",
            "nombre_producto",
            "unidad_medida",
            "precio_unitario",
            "cantidad",
            "modalidad",
            "detalles",
            "subtotal",
        )
        read_only_fields = (
            "id",
            "nombre_producto",
            "unidad_medida",
            "precio_unitario",
            "modalidad",
        )


class ReportarNoRecibidoSerializer(serializers.Serializer):
    """Cuerpo opcional del reporte ``/pedidos/{id}/no-recibido/``."""

    motivo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=200,
        help_text="Motivo opcional (máximo 200 caracteres).",
    )


class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True, allow_empty=False, max_length=MAX_LINEAS_POR_PEDIDO)
    codigo_cupon = serializers.CharField(write_only=True, required=False, allow_blank=True)
    acciones_permitidas = serializers.SerializerMethodField()
    horas_extension = serializers.SerializerMethodField()
    tiene_encargo = serializers.SerializerMethodField()

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
            "fecha_solicitada",
            "tiene_encargo",
            "subtotal",
            "tarifa_domicilio",
            "id_cupon",
            "descuento_cupon",
            "total",
            "no_recibido_en",
            "motivo_no_recibido",
            "vence_en",
            "extensiones_plazo",
            "motivo_cancelacion",
            "horas_extension",
            "acciones_permitidas",
            "items",
            "codigo_cupon",
            "fecha_creacion",
            "fecha_actualizacion",
        )
        read_only_fields = (
            "id",
            "id_comprador",
            "estado",
            "latitud_entrega",
            "longitud_entrega",
            "subtotal",
            "tarifa_domicilio",
            "id_cupon",
            "descuento_cupon",
            "total",
            "no_recibido_en",
            "motivo_no_recibido",
            "vence_en",
            "extensiones_plazo",
            "motivo_cancelacion",
            "fecha_creacion",
            "fecha_actualizacion",
        )

    def get_tiene_encargo(self, obj) -> bool:
        """Algún ítem es por encargo (``items`` ya viene en el ``prefetch_related``)."""
        return any(item.modalidad == Producto.Modalidad.ENCARGO for item in obj.items.all())

    def get_horas_extension(self, obj) -> int | None:
        """Horas que suma «Dar más tiempo» (null si el pedido no admite más tiempo)."""
        return services.horas_de_extension(obj)

    def get_acciones_permitidas(self, obj) -> list[str]:
        request = self.context.get("request")
        if request is None:
            return []
        return services.acciones_disponibles(obj, request.user)

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
