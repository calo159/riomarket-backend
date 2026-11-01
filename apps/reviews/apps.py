from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reviews"
    verbose_name = "Reseñas"

    def ready(self):
        from apps.catalog.anotaciones import (
            CALIFICACION_DEL_PUESTO,
            REPUTACION,
            registrar_anotador,
        )
        from apps.reviews import services

        registrar_anotador(REPUTACION, services.anotar_reputacion)
        registrar_anotador(CALIFICACION_DEL_PUESTO, services.anotar_calificacion_del_puesto)
