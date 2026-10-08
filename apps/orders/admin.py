"""Admin de pedidos: historial de ventas y consulta de ítems."""

from django.contrib import admin

from apps.orders.models import ItemPedido, Pedido


class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 0
    # Snapshot congelado al crear: solo lectura (los montos los calcula el
    # servidor; editarlos desde el admin rompería la fórmula del total).
    readonly_fields = (
        "id_producto",
        "nombre_producto",
        "unidad_medida",
        "precio_unitario",
        "cantidad",
    )


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "id_comprador",
        "id_puesto",
        "estado",
        "tipo_entrega",
        "total",
        "fecha_creacion",
    )
    list_filter = ("estado", "tipo_entrega")
    search_fields = (
        "id_comprador__correo",
        "id_comprador__nombre",
        "id_puesto__nombre",
        "direccion_entrega",
    )
    readonly_fields = (
        "subtotal",
        "tarifa_domicilio",
        "total",
        "fecha_creacion",
        "fecha_actualizacion",
    )
    inlines = (ItemPedidoInline,)
