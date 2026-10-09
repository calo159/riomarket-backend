"""Admin de direcciones."""

from django.contrib import admin

from apps.addresses.models import Direccion


@admin.register(Direccion)
class DireccionAdmin(admin.ModelAdmin):
    list_display = ("id", "id_usuario", "alias", "direccion", "es_predeterminada", "activa")
    list_filter = ("es_predeterminada", "activa")
    search_fields = ("alias", "direccion", "id_usuario__correo")
