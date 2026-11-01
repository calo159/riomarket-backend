from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Usuarios y confianza"

    def ready(self):
        from apps.accounts import insignias

        insignias.registrar()
