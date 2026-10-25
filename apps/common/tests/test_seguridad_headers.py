"""Pruebas de las cabeceras de seguridad y de la CSP por tipo de respuesta."""

import pytest

from apps.common.security_headers import _csp


def _directivas(csp: str) -> dict[str, str]:
    return dict(directiva.split(" ", 1) for directiva in csp.split("; "))


def test_la_api_usa_una_csp_estricta(client):
    respuesta = client.get("/api/health/")

    directivas = _directivas(respuesta["Content-Security-Policy"])

    assert directivas["default-src"] == "'self'"
    assert directivas["script-src"] == "'self'"
    assert "unsafe-inline" not in directivas["script-src"]
    assert respuesta["X-Content-Type-Options"] == "nosniff"
    assert respuesta["X-Frame-Options"] == "DENY"


def test_la_documentacion_permite_los_assets_de_swagger(client):
    respuesta = client.get("/api/docs/")

    assert respuesta.status_code == 200
    csp = respuesta["Content-Security-Policy"]
    assert "https://cdn.jsdelivr.net" in csp
    assert "'unsafe-inline'" in csp
    assert "https://fonts.gstatic.com" in csp


@pytest.mark.django_db
def test_el_admin_puede_usar_scripts_inline(client):
    respuesta = client.get("/admin/login/")

    assert respuesta.status_code == 200
    directivas = _directivas(respuesta["Content-Security-Policy"])
    assert "'unsafe-inline'" in directivas["script-src"]
    assert "cdn.jsdelivr.net" not in directivas["script-src"]


def test_el_path_de_docs_no_contamina_la_csp_de_la_app():
    class Peticion:
        path = "/catalogo"

    csp = _csp(Peticion())

    assert "cdn.jsdelivr.net" not in csp
    assert "unsafe-inline" not in _directivas(csp)["script-src"]
