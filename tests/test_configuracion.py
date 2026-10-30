"""Configuración de seguridad: hallazgos I-08 (orden de middleware) e I-20 (SECRET_KEY)."""

import importlib

import pytest
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def test_cabeceras_de_seguridad_van_antes_de_whitenoise():
    middleware = settings.MIDDLEWARE
    seguridad = middleware.index("apps.common.security_headers.SecurityHeadersMiddleware")
    estaticos = middleware.index("whitenoise.middleware.WhiteNoiseMiddleware")
    assert seguridad < estaticos


@pytest.mark.parametrize("clave", ["change-me-in-production-insecure-secret-key", "corta"])
def test_produccion_rechaza_una_secret_key_insegura(monkeypatch, clave):
    monkeypatch.setenv("SECRET_KEY", clave)
    monkeypatch.setenv("ALLOWED_HOSTS", "riomarket.onrender.com")
    monkeypatch.setenv("FERNET_KEY", "x" * 10)
    import config.settings.base as base

    importlib.reload(base)
    try:
        with pytest.raises(ImproperlyConfigured):
            import config.settings.prod as prod

            importlib.reload(prod)
    finally:
        monkeypatch.undo()
        importlib.reload(base)
