"""robots.txt, sitemap.xml y metaetiquetas por ruta (paquete B, ADR-011)."""

import xml.etree.ElementTree as ET
from pathlib import Path

import pytest
from django.core.files.base import ContentFile
from django.db import connection
from django.test import Client, RequestFactory, override_settings
from django.test.utils import CaptureQueriesContext

from apps.catalog.models import ImagenProducto, Producto, Puesto
from apps.common.security_headers import SecurityHeadersMiddleware
from apps.sitio.views import FrontendCatchAllView
from tests.factories import ProductoFactory, PuestoFactory

pytestmark = pytest.mark.django_db

NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
HOST = "testserver"

INDEX = """<!doctype html>
<html lang="es"><head>
<meta property="og:title" content="__OG_TITULO__" />
<meta property="og:description" content="__OG_DESCRIPCION__" />
<meta property="og:image" content="__OG_IMAGEN__" />
<meta property="og:url" content="__ORIGEN____RUTA__" />
<link rel="canonical" href="__ORIGEN____RUTA__" />
</head><body><div id="root"></div></body></html>"""

CSP_ESPERADA = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https://tile.openstreetmap.org; font-src 'self' data:; "
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


@pytest.fixture
def dist(tmp_path):
    raiz = tmp_path / "frontend" / "dist"
    raiz.mkdir(parents=True)
    (raiz / "index.html").write_text(INDEX, encoding="utf-8")
    with override_settings(BASE_DIR=tmp_path):
        yield raiz


def _meta(html: str) -> dict[str, str]:
    """Pares propiedad -> contenido de las metaetiquetas og:* y del canonical."""
    import re

    pares = dict(re.findall(r'<meta property="([^"]+)" content="([^"]*)"', html))
    canonico = re.search(r'<link rel="canonical" href="([^"]*)"', html)
    if canonico:
        pares["canonical"] = canonico.group(1)
    return pares


def _pedir_index(path: str):
    return FrontendCatchAllView.as_view()(RequestFactory().get(path))


def _urls_del_sitemap(respuesta) -> list[str]:
    raiz = ET.fromstring(respuesta.content)
    return [nodo.text for nodo in raiz.findall("s:url/s:loc", NS)]


# ---------------------------------------------------------------------------
# robots.txt
# ---------------------------------------------------------------------------
def test_robots_es_texto_y_apunta_al_sitemap():
    respuesta = Client().get("/robots.txt")

    assert respuesta.status_code == 200
    assert respuesta["Content-Type"] == "text/plain; charset=utf-8"
    assert "max-age=3600" in respuesta["Cache-Control"]
    lineas = respuesta.content.decode().splitlines()
    assert lineas[0] == "User-agent: *"
    assert "Allow: /" in lineas
    assert lineas[-1] == f"Sitemap: http://{HOST}/sitemap.xml"
    # Ninguna línea es HTML (el síntoma original: robots.txt devolvía la SPA).
    assert not any(linea.lstrip().startswith("<") for linea in lineas)


def test_robots_bloquea_rutas_privadas():
    lineas = Client().get("/robots.txt").content.decode().splitlines()
    bloqueadas = [linea.split(": ", 1)[1] for linea in lineas if linea.startswith("Disallow: ")]

    assert bloqueadas == [
        "/api/",
        "/admin/",
        "/vendedor",
        "/checkout",
        "/carrito",
        "/pedidos/",
        "/mis-pedidos",
        "/direcciones",
        "/notificaciones",
        "/perfil",
    ]


# ---------------------------------------------------------------------------
# sitemap.xml
# ---------------------------------------------------------------------------
def test_sitemap_lista_paginas_puestos_y_productos_activos():
    puesto = PuestoFactory()
    producto = ProductoFactory(id_puesto=puesto)

    respuesta = Client().get("/sitemap.xml")

    assert respuesta.status_code == 200
    assert respuesta["Content-Type"].split(";")[0] == "application/xml"
    assert _urls_del_sitemap(respuesta) == [
        f"http://{HOST}/",
        f"http://{HOST}/tienda",
        f"http://{HOST}/catalogo",
        f"http://{HOST}/mapa",
        f"http://{HOST}/puestos/{puesto.pk}",
        f"http://{HOST}/productos/{producto.pk}",
    ]


def test_sitemap_omite_productos_inactivos_y_puestos_suspendidos():
    visible = ProductoFactory()
    ProductoFactory(estado=Producto.Estado.INACTIVO)
    ProductoFactory(estado=Producto.Estado.BLOQUEADO)
    suspendido = PuestoFactory(estado=Puesto.Estado.SUSPENDIDO)
    ProductoFactory(id_puesto=suspendido)
    inactivo = PuestoFactory(estado=Puesto.Estado.INACTIVO)

    urls = _urls_del_sitemap(Client().get("/sitemap.xml"))

    assert f"http://{HOST}/productos/{visible.pk}" in urls
    assert [u for u in urls if "/productos/" in u] == [f"http://{HOST}/productos/{visible.pk}"]
    assert f"http://{HOST}/puestos/{suspendido.pk}" not in urls
    assert f"http://{HOST}/puestos/{inactivo.pk}" not in urls


def test_sitemap_hace_consultas_constantes():
    def consultas() -> int:
        with CaptureQueriesContext(connection) as contexto:
            assert Client().get("/sitemap.xml").status_code == 200
        return len(contexto)

    ProductoFactory()
    con_uno = consultas()
    for _ in range(19):
        ProductoFactory()
    con_veinte = consultas()

    assert con_uno <= 4
    assert con_veinte == con_uno


# ---------------------------------------------------------------------------
# index.html con el origen y las metaetiquetas de la ruta
# ---------------------------------------------------------------------------
def test_index_reemplaza_origen_y_ruta(dist):
    respuesta = _pedir_index("/tienda")
    html = respuesta.content.decode()
    meta = _meta(html)

    assert respuesta.status_code == 200
    assert respuesta["Content-Type"] == "text/html; charset=utf-8"
    assert meta["og:url"] == f"http://{HOST}/tienda"
    assert meta["canonical"] == f"http://{HOST}/tienda"
    assert meta["og:title"] == "RioMarket · Mercado de Riohacha"
    assert meta["og:image"] == f"http://{HOST}/og-riomarket.png"
    assert "__" not in html


def test_index_escapa_la_ruta(dist):
    html = _pedir_index('/x"><script>alert(1)</script>').content.decode()

    assert "<script>" not in html
    assert _meta(html)["canonical"] == f"http://{HOST}/x%22%3E%3Cscript%3Ealert(1)%3C/script%3E"


def test_index_de_producto_lleva_su_titulo_escapado(dist):
    producto = ProductoFactory(
        nombre='Mango <script>alert("x")</script>', descripcion="Dulce y jugoso. " * 20
    )
    ImagenProducto.objects.create(
        id_producto=producto, archivo=ContentFile(b"x", name="mango.jpg"), orden=1
    )

    html = _pedir_index(f"/productos/{producto.pk}").content.decode()
    meta = _meta(html)

    assert "<script>" not in html
    assert meta["og:title"] == "Mango &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; · RioMarket"
    assert meta["og:description"].startswith("Dulce y jugoso.")
    assert len(meta["og:description"]) <= 160
    assert meta["og:image"].startswith(f"http://{HOST}/media/productos/")
    assert meta["og:url"] == f"http://{HOST}/productos/{producto.pk}"


def test_index_de_producto_usa_una_sola_consulta(dist):
    producto = ProductoFactory()
    with CaptureQueriesContext(connection) as contexto:
        _pedir_index(f"/productos/{producto.pk}")
    assert len(contexto) == 1


def test_index_de_puesto_lleva_su_nombre(dist):
    puesto = PuestoFactory(nombre="Frutas del Caribe", descripcion="Fruta fresca de la Guajira.")

    meta = _meta(_pedir_index(f"/puestos/{puesto.pk}").content.decode())

    assert meta["og:title"] == "Frutas del Caribe · RioMarket"
    assert meta["og:description"] == "Fruta fresca de la Guajira."


@pytest.mark.parametrize(
    "preparar",
    [
        lambda: ProductoFactory(estado=Producto.Estado.BLOQUEADO),
        lambda: ProductoFactory(estado=Producto.Estado.INACTIVO),
        lambda: ProductoFactory(id_puesto=PuestoFactory(estado=Puesto.Estado.SUSPENDIDO)),
    ],
)
def test_index_de_producto_bloqueado_usa_metas_genericas(dist, preparar):
    producto = preparar()

    meta = _meta(_pedir_index(f"/productos/{producto.pk}").content.decode())

    assert meta["og:title"] == "RioMarket · Mercado de Riohacha"
    assert producto.nombre not in meta["og:description"]
    assert meta["og:image"] == f"http://{HOST}/og-riomarket.png"


def test_index_de_puesto_suspendido_o_inexistente_usa_metas_genericas(dist):
    suspendido = PuestoFactory(estado=Puesto.Estado.SUSPENDIDO)

    for ruta in (f"/puestos/{suspendido.pk}", "/puestos/999999", "/productos/99999999999999"):
        respuesta = _pedir_index(ruta)
        assert respuesta.status_code == 200  # la SPA decide qué mostrar; desde aquí nunca 404
        assert _meta(respuesta.content.decode())["og:title"] == "RioMarket · Mercado de Riohacha"


def test_un_nombre_con_marcadores_no_se_vuelve_a_sustituir(dist):
    producto = ProductoFactory(nombre="__ORIGEN__ __RUTA__")

    meta = _meta(_pedir_index(f"/productos/{producto.pk}").content.decode())

    assert meta["og:title"] == "__ORIGEN__ __RUTA__ · RioMarket"


def test_index_siempre_se_revalida(dist):
    assert _pedir_index("/tienda")["Cache-Control"] == "no-cache"


def test_index_sin_build_da_404():
    from django.http import Http404

    with override_settings(BASE_DIR=Path("/no/existe")), pytest.raises(Http404):
        _pedir_index("/tienda")


def test_index_se_relee_si_el_archivo_cambia(dist):
    primero = _pedir_index("/tienda").content.decode()
    nuevo = INDEX.replace('<div id="root">', '<div id="root" data-v="2">')
    (dist / "index.html").write_text(nuevo, encoding="utf-8")
    import os

    ahora = (dist / "index.html").stat().st_mtime_ns + 5_000_000_000
    os.utime(dist / "index.html", ns=(ahora, ahora))

    assert 'data-v="2"' not in primero
    assert 'data-v="2"' in _pedir_index("/tienda").content.decode()


def test_csp_no_cambia_en_index(dist):
    middleware = SecurityHeadersMiddleware(FrontendCatchAllView.as_view())

    respuesta = middleware(RequestFactory().get("/tienda"))

    assert respuesta["Content-Security-Policy"] == CSP_ESPERADA
