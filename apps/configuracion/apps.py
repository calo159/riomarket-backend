from django.apps import AppConfig
from django.db.models.signals import post_delete, post_save


class ConfiguracionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.configuracion"
    verbose_name = "Configuración de la plataforma"

    def ready(self):
        from apps.common import ajustes
        from apps.configuracion import lectura
        from apps.configuracion.models import ConfiguracionPlataforma

        ajustes.registrar_proveedor(lectura.proveedor)

        def descartar(**_):
            lectura.invalidar()

        post_save.connect(descartar, sender=ConfiguracionPlataforma, weak=False)
        post_delete.connect(descartar, sender=ConfiguracionPlataforma, weak=False)
