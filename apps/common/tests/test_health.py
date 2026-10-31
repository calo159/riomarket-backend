"""Pruebas del contrato de ``/api/health/`` (ADR-015)."""

import json
import re

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.common import views

URL = "/api/health/"


@pytest.fixture(autouse=True)
def _reiniciar_cache_de_migraciones():
    views._MIGRACIONES.update(valor=None, hasta=0.0)
    yield
    views._MIGRACIONES.update(valor=None, hasta=0.0)


@pytest.mark.django_db
def test_health_ok_con_campos_esperados(client):
    respuesta = client.get(URL)
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert set(datos) == {
        "status",
        "database",
        "version",
        "migraciones",
        "almacenamiento_externo",
        "hora_servidor",
    }
    assert datos["status"] == "ok"
    assert datos["database"] == "up"
    assert datos["migraciones"] == "al_dia"
    assert datos["almacenamiento_externo"] is False
    assert re.match(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$", datos["hora_servidor"])


@pytest.mark.django_db
def test_version_corta_del_commit(client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "f7b4aa8c0ffee0123456789abcdef0123456789a")
    assert client.get(URL).json()["version"] == "f7b4aa8"


@pytest.mark.django_db
@pytest.mark.parametrize("valor", ["", "no es hexadecimal", "../../etc/passwd"])
def test_version_desconocida_si_falta_o_es_invalida(client, monkeypatch, valor):
    monkeypatch.setenv("RENDER_GIT_COMMIT", valor)
    assert client.get(URL).json()["version"] == "desconocida"


@pytest.mark.django_db
def test_almacenamiento_externo_si_esta_configurado(client, settings):
    settings.STORAGES = {
        **settings.STORAGES,
        "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
    }
    assert client.get(URL).json()["almacenamiento_externo"] is True


@pytest.mark.django_db
def test_health_503_si_la_base_cae(client, monkeypatch):
    def romper(*args, **kwargs):
        raise RuntimeError("password authentication failed for user riomarket host=10.0.0.5")

    monkeypatch.setattr("django.db.backends.base.base.BaseDatabaseWrapper.cursor", romper)
    respuesta = client.get(URL)
    assert respuesta.status_code == 503
    datos = respuesta.json()
    assert datos["status"] == "degraded"
    assert datos["database"] == "down"
    assert datos["migraciones"] == "desconocido"
    texto = respuesta.content.decode()
    assert "password" not in texto
    assert "10.0.0.5" not in texto


@pytest.mark.django_db
def test_migraciones_pendientes(client, monkeypatch):
    monkeypatch.setattr(views, "_hay_migraciones_pendientes", lambda: True)
    respuesta = client.get(URL)
    assert respuesta.status_code == 200
    assert respuesta.json()["migraciones"] == "pendientes"


@pytest.mark.django_db
def test_si_falla_el_calculo_de_migraciones_degrada_a_desconocido(client, monkeypatch):
    def romper():
        raise RuntimeError("grafo roto en /srv/app/migrations")

    monkeypatch.setattr(views, "_hay_migraciones_pendientes", romper)
    respuesta = client.get(URL)
    assert respuesta.status_code == 200
    assert respuesta.json()["migraciones"] == "desconocido"
    assert "/srv" not in respuesta.content.decode()


@pytest.mark.django_db
def test_migraciones_pendientes_se_cachea(client, monkeypatch):
    llamadas = []

    def contar():
        llamadas.append(1)
        return False

    monkeypatch.setattr(views, "_hay_migraciones_pendientes", contar)
    client.get(URL)
    client.get(URL)
    assert len(llamadas) == 1


@pytest.mark.django_db
def test_migraciones_se_recalculan_al_vencer_la_cache(client, monkeypatch):
    llamadas = []
    monkeypatch.setattr(views, "_hay_migraciones_pendientes", lambda: llamadas.append(1) or False)
    client.get(URL)
    views._MIGRACIONES["hasta"] = 0.0
    client.get(URL)
    assert len(llamadas) == 2


@pytest.mark.django_db
def test_segunda_llamada_es_barata(client):
    client.get(URL)
    with CaptureQueriesContext(connection) as consultas:
        client.get(URL)
    assert len(consultas) == 1  # solo SELECT 1


@pytest.mark.django_db
def test_health_no_filtra_secretos(client, settings, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abcdef1234567")
    settings.STORAGES = {
        **settings.STORAGES,
        "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
    }
    settings.AWS_STORAGE_BUCKET_NAME = "bucket-secreto-riomarket"
    settings.AWS_S3_ENDPOINT_URL = "https://endpoint-secreto.example"
    texto = client.get(URL).content.decode()
    for prohibido in (
        settings.SECRET_KEY,
        "FERNET",
        "DATABASE_URL",
        "AWS_",
        "bucket-secreto-riomarket",
        "endpoint-secreto",
        "sqlite",
        "postgres",
        "debug",
        "/",
        "\\",
    ):
        assert prohibido not in texto
    assert json.loads(texto)["almacenamiento_externo"] is True


def test_health_solo_acepta_get(client):
    assert client.post(URL).status_code == 405
