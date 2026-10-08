"""Almacenamiento PRIVADO para documentos sensibles (foto de cédula).

Vive fuera de ``MEDIA_ROOT`` (``settings.PRIVATE_MEDIA_ROOT``) y **nunca** se
sirve con ``static()``: se entrega solo a través de una vista protegida
(ADR-002). ``base_location`` se resuelve dinámicamente desde la configuración
para que los tests puedan apuntarla a un directorio temporal.
"""

import os

from django.core.files.storage import FileSystemStorage


class PrivateMediaStorage(FileSystemStorage):
    """FileSystemStorage cuyos archivos caen en la raíz privada de medios."""

    def __init__(self, *args, **kwargs):
        # La raíz la definen las properties (no MEDIA_ROOT).
        kwargs.pop("location", None)
        kwargs.pop("base_url", None)
        super().__init__(*args, **kwargs)

    @property
    def base_location(self):
        from django.conf import settings

        return os.path.abspath(settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self):
        # ``location`` es un cached_property en FileSystemStorage y se calcularía
        # una sola vez con MEDIA_ROOT; leerlo en vivo permite que los tests
        # apunten PRIVATE_MEDIA_ROOT a un directorio temporal con
        # ``override_settings``.
        return self.base_location
