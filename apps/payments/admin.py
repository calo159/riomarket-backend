"""Admin de pagos."""

from django.contrib import admin

from apps.payments.models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "id_pedido",
        "metodo_pago",
        "estado",
        "subtotal_pedido",
        "tarifa_domicilio_aplicada",
        "comision_plataforma",
        "total_cobrado",
        "referencia_gateway",
        "fecha_creacion",
        "fecha_aprobacion",
    )
    list_filter = ("estado", "metodo_pago")
    search_fields = ("referencia_gateway", "id_pedido__pk")
    readonly_fields = (
        "subtotal_pedido",
        "tarifa_domicilio_aplicada",
        "comision_plataforma",
        "total_cobrado",
        "fecha_creacion",
        "fecha_actualizacion",
        "fecha_aprobacion",
        "datos_sandbox",
    )
