from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.accounts.models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    """Admin operativo de RioMarket.

    - El password nunca es editable desde la UI (solo se muestra el hash):
      no existe riesgo de guardar una contraseña en texto plano desde aquí.
    - El alta de usuarios se hace por la API (Incremento 1) o con
      ``python manage.py createsuperuser``.
    """

    list_display = ("correo", "nombre", "celular", "rol", "estado", "fecha_registro")
    list_filter = ("rol", "estado", "is_staff")
    search_fields = ("correo", "nombre", "celular")
    ordering = ("-fecha_registro",)
    readonly_fields = ("password", "fecha_registro", "last_login")
    exclude = ("groups", "user_permissions")
    actions = ("suspender_seleccionados", "activar_seleccionados")

    fieldsets = (
        (None, {"fields": ("correo", "nombre", "celular", "password")}),
        (_("Rol y estado"), {"fields": ("rol", "estado")}),
        (_("Administración Django"), {"fields": ("is_staff", "is_superuser")}),
        (_("Fechas"), {"fields": ("fecha_registro", "last_login")}),
    )

    def has_add_permission(self, request):
        # El alta es por API o createsuperuser: un ModelAdmin genérico
        # guardaría la contraseña tal cual se escriba en el formulario.
        return False

    @admin.action(description="Suspender usuarios seleccionados")
    def suspender_seleccionados(self, request, queryset):
        updated = queryset.update(estado=Usuario.Estado.SUSPENDIDO)
        self.message_user(request, f"{updated} usuario(s) suspendido(s).")

    @admin.action(description="Activar usuarios seleccionados")
    def activar_seleccionados(self, request, queryset):
        updated = queryset.update(estado=Usuario.Estado.ACTIVO)
        self.message_user(request, f"{updated} usuario(s) activado(s).")
