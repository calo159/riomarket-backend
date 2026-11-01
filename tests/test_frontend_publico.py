"""Archivos reales del build (service worker, manifest, página sin conexión) y su tipo MIME.

El catch-all de la SPA devuelve ``index.html`` con 200 para rutas desconocidas: estos archivos
deben salir tal cual y, si faltan, dar 404 (nunca HTML disfrazado de JavaScript).
"""

import pytest
from django.core.exceptions import SuspiciousFileOperation
from django.http import Http404
from django.test import RequestFactory, override_settings

from apps.sitio.views import ArchivoFrontendView

CONTENIDO = {
    "sw.js": ("self.addEventListener('fetch', () => {});", "text/javascript"),
    "offline.html": ("<!doctype html><title>Sin conexión</title>", "text/html"),
    "offline.js": ("// reintentar", "text/javascript"),
    "manifest.webmanifest": ('{"name": "RioMarket"}', "application/manifest+json"),
    "icons/icon-192.png": ("png", "image/png"),
}


@pytest.fixture
def dist(tmp_path):
    raiz = tmp_path / "frontend" / "dist"
    (raiz / "icons").mkdir(parents=True)
    (raiz / "index.html").write_text("<div id='root'></div>", encoding="utf-8")
    for nombre, (texto, _) in CONTENIDO.items():
        (raiz / nombre).write_text(texto, encoding="utf-8")
    with override_settings(BASE_DIR=tmp_path):
        yield raiz


def _pedir(path):
    peticion = RequestFactory().get(f"/{path}")
    return ArchivoFrontendView.as_view()(peticion, path=path)


@pytest.mark.parametrize("nombre", list(CONTENIDO))
def test_sirve_el_archivo_real_con_su_tipo_mime(dist, nombre):
    texto, tipo = CONTENIDO[nombre]
    respuesta = _pedir(nombre)

    assert respuesta.status_code == 200
    assert respuesta["Content-Type"].split(";")[0] == tipo
    assert b"".join(respuesta.streaming_content) == texto.encode("utf-8")
    assert b"id='root'" not in b"".join(respuesta.streaming_content)


def test_si_el_archivo_falta_da_404_y_no_el_index(dist):
    (dist / "sw.js").unlink()
    with pytest.raises(Http404):
        _pedir("sw.js")


def test_no_sale_de_la_carpeta_del_build(dist):
    with pytest.raises((Http404, SuspiciousFileOperation)):
        _pedir("../../../manage.py")


def test_whitenoise_conoce_el_tipo_del_manifest(settings):
    from whitenoise.media_types import MediaTypes

    tipos = MediaTypes(extra_types=settings.WHITENOISE_MIMETYPES)
    assert tipos.get_type("/dist/manifest.webmanifest") == "application/manifest+json"
    assert tipos.get_type("/dist/sw.js") == "text/javascript"
