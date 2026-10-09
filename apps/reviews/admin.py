"""Admin de reseñas (moderación: ocultar reseñas)."""

from django.contrib import admin

from apps.reviews.models import Resena


@admin.register(Resena)
class ResenaAdmin(admin.ModelAdmin):
    list_display = ("id", "id_puesto", "id_usuario", "calificacion", "visible", "fecha_creacion")
    list_filter = ("calificacion", "visible")
    search_fields = ("comentario", "respuesta", "id_usuario__correo", "id_puesto__nombre")
    readonly_fields = ("fecha_creacion", "fecha_actualizacion", "fecha_respuesta")
