"""Admin de notificaciones."""

from django.contrib import admin

from apps.notifications.models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("id", "id_usuario", "tipo", "titulo", "leida", "fecha_creacion")
    list_filter = ("tipo", "leida")
    search_fields = ("titulo", "mensaje", "id_usuario__correo")
    readonly_fields = ("fecha_creacion", "fecha_lectura")
