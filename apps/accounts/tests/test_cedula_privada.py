"""La foto de cédula usa un bucket S3 privado si está configurado (I-04)."""

import io

from django.core.files.base import ContentFile

from apps.common.storage import PrivateMediaStorage


class FalsoS3:
    """Doble en memoria de S3Boto3Storage: registra lo que se le pide."""

    def __init__(self, **opciones):
        self.opciones = opciones
        self.guardado = {}

    def get_available_name(self, name, max_length=None):
        return name

    def _save(self, name, content):
        self.guardado[name] = content.read()
        return name

    def _open(self, name, mode="rb"):
        return ContentFile(self.guardado[name], name=name)

    def exists(self, name):
        return name in self.guardado

    def delete(self, name):
        self.guardado.pop(name, None)

    def size(self, name):
        return len(self.guardado[name])


def test_sin_bucket_privado_usa_el_disco_local(settings, tmp_path):
    settings.PRIVATE_S3_BUCKET = ""
    settings.PRIVATE_MEDIA_ROOT = str(tmp_path)
    almacen = PrivateMediaStorage()
    nombre = almacen.save("cedulas/a.png", io.BytesIO(b"x"))
    assert (tmp_path / nombre).exists()


def test_con_bucket_privado_guarda_en_s3_y_no_en_disco(settings, tmp_path, monkeypatch):
    settings.PRIVATE_S3_BUCKET = "cedulas-privadas"
    settings.PRIVATE_MEDIA_ROOT = str(tmp_path)
    settings.AWS_ACCESS_KEY_ID = "k"
    settings.AWS_SECRET_ACCESS_KEY = "s"
    settings.AWS_S3_ENDPOINT_URL = "https://s3.example.test"
    monkeypatch.setattr("storages.backends.s3boto3.S3Boto3Storage", FalsoS3)

    almacen = PrivateMediaStorage()
    nombre = almacen.save("cedulas/a.png", io.BytesIO(b"foto"))

    assert almacen._remoto().opciones["bucket_name"] == "cedulas-privadas"
    assert almacen._remoto().opciones["default_acl"] == "private"
    assert almacen.exists(nombre)
    assert almacen.open(nombre).read() == b"foto"
    assert list(tmp_path.iterdir()) == []
    almacen.delete(nombre)
    assert not almacen.exists(nombre)
