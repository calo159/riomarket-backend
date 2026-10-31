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


class _Peticion:
    path = "/catalogo"


def test_con_medios_en_un_almacen_externo_la_csp_permite_esas_imagenes(settings):
    """Con S3/Supabase las fotos vienen de otro dominio: sin esto el navegador las bloquea."""
    settings.MEDIA_URL = "https://abc123.storage.supabase.co/storage/v1/object/public/productos/"

    origenes = _directivas(_csp(_Peticion()))["img-src"].split()

    # Solo el origen del almacén (sin la ruta del bucket), además de lo que ya había.
    assert origenes == [
        "'self'",
        "data:",
        "blob:",
        "https://tile.openstreetmap.org",
        "https://abc123.storage.supabase.co",
    ]


def test_con_medios_locales_la_csp_no_abre_otros_origenes(settings):
    settings.MEDIA_URL = "/media/"

    img = _directivas(_csp(_Peticion()))["img-src"]

    assert img == "'self' data: blob: https://tile.openstreetmap.org"


def test_el_origen_de_medios_no_se_aplica_a_scripts(settings):
    settings.MEDIA_URL = "https://abc123.storage.supabase.co/storage/v1/object/public/productos/"

    directivas = _directivas(_csp(_Peticion()))

    assert "supabase" not in directivas["script-src"]
    assert "supabase" not in directivas["connect-src"]


def test_la_csp_de_la_app_cubre_mapa_y_service_worker_sin_abrir_scripts_externos():
    """Leaflet va empaquetado (mismo origen); solo las teselas de OSM son externas, como imagen."""
    directivas = _directivas(_csp(_Peticion()))

    assert directivas["script-src"] == "'self'"
    origenes_img = directivas["img-src"].split()
    assert origenes_img.count("https://tile.openstreetmap.org") == 1
    assert [o for o in origenes_img if o.startswith("https://")] == [
        "https://tile.openstreetmap.org"
    ]
    assert directivas["connect-src"] == "'self'"
    # El service worker (/sw.js) y el manifest son del mismo origen: caen en default-src 'self'
    # (worker-src -> script-src -> default-src; manifest-src -> default-src).
    assert directivas["default-src"] == "'self'"
    assert "worker-src" not in directivas
    assert "manifest-src" not in directivas
