from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
    verbose_name = "Utilidades compartidas"

    def ready(self):
        # Registra la extensión OpenAPI de JWT (debe importarse para que
        # drf-spectacular la descubra al generar el schema).
        from apps.common import schema  # noqa: F401
