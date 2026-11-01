"""El sitio público: la aplicación web, ``robots.txt``, ``sitemap.xml`` y las metaetiquetas."""

from django.apps import AppConfig


class SitioConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sitio"
    verbose_name = "Sitio público"
