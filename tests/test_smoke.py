"""Pruebas de humo de la Fase 0: proyecto arranca, docs y health OK."""

import pytest


@pytest.mark.django_db
def test_health_ok(api_client):
    response = api_client.get("/api/health/")
    assert response.status_code == 200
    assert response.json()["database"] == "up"


def test_schema_openapi_genera(api_client):
    response = api_client.get("/api/schema/")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/vnd.oai.openapi")


def test_swagger_ui_disponible(api_client):
    response = api_client.get("/api/docs/")
    assert response.status_code == 200
    assert b"swagger" in response.content.lower()


def test_permiso_por_defecto_es_is_authenticated():
    """El permiso por defecto del DRF es IsAuthenticated (API cerrada por defecto)."""
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.settings import api_settings

    assert IsAuthenticated in api_settings.DEFAULT_PERMISSION_CLASSES


def test_settings_cargados():
    from django.conf import settings

    assert settings.AUTH_USER_MODEL == "accounts.Usuario"
    assert settings.PLATFORM_COMMISSION_PERCENTAGE > 0
    assert settings.SIMPLE_JWT["ROTATE_REFRESH_TOKENS"] is True
    assert settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] is True
