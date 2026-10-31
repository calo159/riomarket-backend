"""Entrega de los archivos del build: caché inmutable solo para lo que lleva hash, y compresión.

``sw.js``, ``index.html``, el manifest y ``theme-init.js`` NUNCA deben ser inmutables: un
service worker o un HTML guardados un año dejarían a los usuarios con versiones viejas.
"""

import re

import pytest
from django.conf import settings
from django.http import HttpResponse
from django.test import RequestFactory, override_settings
from whitenoise.compress import main as comprimir
from whitenoise.middleware import WhiteNoiseMiddleware

from apps.common.views import FrontendCatchAllView

# WhiteNoise usa «para siempre» = 10 años (315360000 s) en lo inmutable.
JS_CON_HASH = "assets/index-AbCd_123.js"
CONTENIDO_JS = "console.log('riomarket');\n" * 400  # lo bastante grande para que comprimir valga


@pytest.fixture
def dist(tmp_path):
    raiz = tmp_path / "frontend" / "dist"
    (raiz / "assets").mkdir(parents=True)
    (raiz / "icons").mkdir()
    (raiz / JS_CON_HASH).write_text(CONTENIDO_JS, encoding="utf-8")
    (raiz / "assets" / "Landing-3WsaaLpA.css").write_text("a{color:red}" * 300, encoding="utf-8")
    (raiz / "assets" / "figtree-latin-wght-normal-B-Cx9f_2.woff2").write_bytes(b"w" * 50)
    for nombre in ("sw.js", "theme-init.js", "offline.js"):
        (raiz / nombre).write_text(CONTENIDO_JS, encoding="utf-8")
    (raiz / "manifest.webmanifest").write_text('{"name": "RioMarket"}' * 50, encoding="utf-8")
    (raiz / "index.html").write_text("<div id='root'></div>" * 50, encoding="utf-8")
    return raiz


def _servir(raiz, ruta, aceptar=""):
    with override_settings(WHITENOISE_ROOT=str(raiz)):
        middleware = WhiteNoiseMiddleware(lambda request: HttpResponse(status=404))
        extra = {"HTTP_ACCEPT_ENCODING": aceptar} if aceptar else {}
        return middleware(RequestFactory().get(ruta, **extra))


# ---------------------------------------------------------------------------
# Caché
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "ruta",
    [
        "/assets/index-AbCd_123.js",
        "/assets/Landing-3WsaaLpA.css",
        "/assets/figtree-latin-wght-normal-B-Cx9f_2.woff2",
        "/assets/vendor-react-NKN-rXFD.js",
    ],
)
def test_assets_con_hash_son_inmutables(dist, ruta):
    # Los dos primeros existen en el dist temporal; para el resto se crea el archivo.
    destino = dist / ruta.lstrip("/")
    destino.parent.mkdir(parents=True, exist_ok=True)
    if not destino.exists():
        destino.write_text(CONTENIDO_JS, encoding="utf-8")

    respuesta = _servir(dist, ruta)

    assert respuesta.status_code == 200
    assert respuesta["Cache-Control"] == "max-age=315360000, public, immutable"


@pytest.mark.parametrize(
    "ruta",
    [
        "/sw.js",
        "/theme-init.js",
        "/offline.js",
        "/manifest.webmanifest",
        "/index.html",
    ],
)
def test_lo_que_no_lleva_hash_nunca_es_inmutable(dist, ruta):
    respuesta = _servir(dist, ruta)

    assert respuesta.status_code == 200
    assert "immutable" not in respuesta["Cache-Control"]
    assert respuesta["Cache-Control"] == "max-age=60, public"


@pytest.mark.parametrize(
    "ruta,debe_ser_inmutable",
    [
        ("/assets/index-AbCd_123.js", True),
        ("/assets/Landing-3WsaaLpA.css", True),
        ("/assets/figtree-latin-wght-normal-B-Cx9f_2.woff2", True),
        ("/assets/vendor-react-NKN-rXFD.js", True),
        ("/assets/index.js", False),  # sin hash
        ("/assets/index-corto.js", False),  # 5 caracteres: no es un hash de Vite
        ("/assets/index-demasiadolargo.js", False),
        ("/sw.js", False),
        ("/index.html", False),
        ("/manifest.webmanifest", False),
        ("/theme-init.js", False),
        ("/icons/icon-192-AbCd_123.png", False),  # solo se confía en lo que vive en assets/
    ],
)
def test_la_expresion_de_inmutabilidad(ruta, debe_ser_inmutable):
    patron = settings.WHITENOISE_IMMUTABLE_FILE_TEST

    assert bool(re.search(patron, ruta)) is debe_ser_inmutable


# ---------------------------------------------------------------------------
# Compresión (lo que hace `python -m whitenoise.compress` en el Dockerfile)
# ---------------------------------------------------------------------------
def test_el_build_comprimido_se_entrega_en_brotli_y_gzip(dist):
    comprimir([str(dist), "--quiet"])

    brotli = _servir(dist, "/" + JS_CON_HASH, aceptar="br, gzip")
    gzip = _servir(dist, "/" + JS_CON_HASH, aceptar="gzip")
    plano = _servir(dist, "/" + JS_CON_HASH)

    assert brotli["Content-Encoding"] == "br"
    assert gzip["Content-Encoding"] == "gzip"
    assert "Content-Encoding" not in plano
    assert brotli["Cache-Control"] == "max-age=315360000, public, immutable"
    assert int(brotli["Content-Length"]) < len(CONTENIDO_JS) / 10
    assert brotli["Vary"] == "Accept-Encoding"


def test_sin_comprimir_no_hay_codificacion(dist):
    """Documenta la causa original: sin los .br/.gz junto al archivo WhiteNoise no comprime."""
    respuesta = _servir(dist, "/" + JS_CON_HASH, aceptar="br, gzip")

    assert "Content-Encoding" not in respuesta


# ---------------------------------------------------------------------------
# index.html
# ---------------------------------------------------------------------------
def test_index_html_sin_cache(dist):
    with override_settings(BASE_DIR=dist.parent.parent):
        respuesta = FrontendCatchAllView.as_view()(RequestFactory().get("/tienda"))

    assert respuesta["Cache-Control"] == "no-cache"
