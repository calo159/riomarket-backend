from django.contrib import admin

from apps.promotions.models import Cupon, UsoCupon


@admin.register(Cupon)
class CuponAdmin(admin.ModelAdmin):
    list_display = ("codigo", "tipo_descuento", "valor", "id_puesto", "activo", "fecha_creacion")
    list_filter = ("activo", "tipo_descuento")
    search_fields = ("codigo",)
    readonly_fields = ("fecha_creacion",)


@admin.register(UsoCupon)
class UsoCuponAdmin(admin.ModelAdmin):
    list_display = ("id", "id_cupon", "id_usuario", "id_pedido", "descuento_aplicado", "fecha_uso")
    list_select_related = ("id_cupon", "id_usuario", "id_pedido")
    readonly_fields = ("fecha_uso",)
