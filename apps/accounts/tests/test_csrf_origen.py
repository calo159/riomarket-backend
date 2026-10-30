"""Hallazgo S-17: el origen se compara completo, no por prefijo."""

import pytest
from rest_framework.test import APIRequestFactory

from apps.accounts.permissions import RequiereCabeceraCSRFPersonalizada


@pytest.mark.parametrize(
    ("origen", "esperado"),
    [
        ("https://riomarket.com", True),
        ("https://riomarket.com/pagina", True),
        ("https://riomarket.com.evil.com", False),
        ("https://riomarket.comx", False),
        ("", False),
    ],
)
def test_origen_exacto(settings, origen, esperado):
    settings.AUTH_COOKIE_CSRF_EXEMPT = False
    settings.CSRF_TRUSTED_ORIGINS = ["https://riomarket.com"]
    settings.CORS_ALLOWED_ORIGINS = []
    peticion = APIRequestFactory().post("/api/auth/logout/", HTTP_ORIGIN=origen)
    assert RequiereCabeceraCSRFPersonalizada().has_permission(peticion, None) is esperado
