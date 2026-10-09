from django.contrib import admin

from apps.audit.models import RegistroAuditoria


@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = (
        "fecha_creacion",
        "accion",
        "entidad",
        "id_entidad",
        "id_usuario",
        "direccion_ip",
    )
    list_filter = ("accion", "entidad")
    search_fields = ("entidad", "id_entidad", "id_usuario__correo")
    list_select_related = ("id_usuario",)
    readonly_fields = (
        "id_usuario",
        "accion",
        "entidad",
        "id_entidad",
        "detalle",
        "direccion_ip",
        "fecha_creacion",
    )

    def has_add_permission(self, request):
        return False
