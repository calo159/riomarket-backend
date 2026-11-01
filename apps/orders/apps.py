from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    verbose_name = "Pedidos y logistica"

    def ready(self):
        from apps.orders import insignias

        insignias.registrar()
