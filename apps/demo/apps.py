"""Datos de demostración: comandos para sembrar usuarios, puestos, productos y fotos de prueba."""

from django.apps import AppConfig


class DemoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.demo"
    verbose_name = "Datos de demostración"
