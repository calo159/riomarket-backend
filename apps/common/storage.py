"""Almacenamiento PRIVADO para documentos sensibles (foto de cédula).

Vive fuera de ``MEDIA_ROOT`` (``settings.PRIVATE_MEDIA_ROOT``) y **nunca** se
sirve con ``static()``: se entrega solo a través de una vista protegida
(ADR-002). ``base_location`` se resuelve dinámicamente desde la configuración
para que los tests puedan apuntarla a un directorio temporal.
"""

import os

from django.core.files.storage import FileSystemStorage


class PrivateMediaStorage(FileSystemStorage):
    """Almacén de documentos privados (foto de cédula).

    Con ``PRIVATE_S3_BUCKET`` configurado guarda en un bucket S3 PRIVADO (sobrevive a los redeploys
    de Render y nunca es público: se lee desde el servidor). Sin él usa la raíz privada local.
    El nombre de la clase no cambia para no tocar las migraciones existentes.
    """

    def _remoto(self):
        from django.conf import settings

        bucket = getattr(settings, "PRIVATE_S3_BUCKET", "")
        if not bucket:
            return None
        if getattr(self, "_s3", None) is None:
            from storages.backends.s3boto3 import S3Boto3Storage

            self._s3 = S3Boto3Storage(
                bucket_name=bucket,
                access_key=settings.AWS_ACCESS_KEY_ID,
                secret_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
                default_acl="private",
                querystring_auth=True,
                file_overwrite=False,
                custom_domain=None,
            )
        return self._s3

    def get_available_name(self, name, max_length=None):
        remoto = self._remoto()
        if remoto:
            return remoto.get_available_name(name, max_length=max_length)
        return super().get_available_name(name, max_length=max_length)

    def _save(self, name, content):
        remoto = self._remoto()
        return remoto._save(name, content) if remoto else super()._save(name, content)

    def _open(self, name, mode="rb"):
        remoto = self._remoto()
        return remoto._open(name, mode) if remoto else super()._open(name, mode)

    def exists(self, name):
        remoto = self._remoto()
        return remoto.exists(name) if remoto else super().exists(name)

    def delete(self, name):
        remoto = self._remoto()
        return remoto.delete(name) if remoto else super().delete(name)

    def size(self, name):
        remoto = self._remoto()
        return remoto.size(name) if remoto else super().size(name)

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
