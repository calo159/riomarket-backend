"""SEO: ``robots.txt``, ``sitemap.xml`` y metaetiquetas por ruta para el ``index.html`` de la SPA.

La SPA no se renderiza en el servidor (ADR-011), pero los rastreadores y las vistas previas de
WhatsApp solo leen el HTML inicial. Por eso Django completa las metaetiquetas Open Graph de
``index.html`` con el origen real y, en productos y puestos públicos, con su nombre y su foto.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import quote

from django.contrib.sitemaps import Sitemap
from django.db.models import OuterRef, Subquery
from django.http import HttpResponse
from django.utils.cache import patch_cache_control
from django.utils.html import escape
from django.views import View

from apps.catalog.models import ImagenProducto, Producto, Puesto

# Páginas privadas o sin valor para un buscador (el panel y las pantallas con sesión).
RUTAS_PRIVADAS = (
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
)

TITULO_GENERICO = "RioMarket · Mercado de Riohacha"
DESCRIPCION_GENERICA = (
    "Compra en los puestos del mercado de Riohacha desde el celular: a domicilio o para recoger."
)
IMAGEN_GENERICA = "/og-riomarket.png"
LARGO_DESCRIPCION = 150

# Un id de más de 9 dígitos no puede existir; evita desbordar el entero de la base de datos.
_RUTA_PRODUCTO = re.compile(r"^/productos/(\d{1,9})/?$")
_RUTA_PUESTO = re.compile(r"^/puestos/(\d{1,9})/?$")


_MARCADORES = re.compile(r"__(?:OG_TITULO|OG_DESCRIPCION|OG_IMAGEN|ORIGEN|RUTA)__")


class RobotsView(View):
    """``/robots.txt``: texto plano, con las rutas privadas excluidas y el enlace al sitemap."""

    def get(self, request):
        lineas = ["User-agent: *", "Allow: /"]
        lineas += [f"Disallow: {ruta}" for ruta in RUTAS_PRIVADAS]
        lineas.append(f"Sitemap: {request.build_absolute_uri('/sitemap.xml')}")
        respuesta = HttpResponse("\n".join(lineas) + "\n", content_type="text/plain; charset=utf-8")
        patch_cache_control(respuesta, public=True, max_age=3600)
        return respuesta


class PaginasPublicas(Sitemap):
    changefreq = "daily"
    priority = 0.8

    def items(self):
        return ["/", "/tienda", "/catalogo", "/mapa"]

    def location(self, item):
        return item


class PuestosSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.6

    def items(self):
        return Puesto.objects.filter(estado=Puesto.Estado.ACTIVO).only("id").order_by("id")

    def location(self, item):
        return f"/puestos/{item.pk}"


class ProductosSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.7
    limit = 5000

    def items(self):
        return (
            Producto.objects.filter(
                estado=Producto.Estado.ACTIVO, id_puesto__estado=Puesto.Estado.ACTIVO
            )
            .only("id")
            .order_by("id")
        )

    def location(self, item):
        return f"/productos/{item.pk}"


SITEMAPS = {
    "paginas": PaginasPublicas,
    "puestos": PuestosSitemap,
    "productos": ProductosSitemap,
}


@dataclass(frozen=True)
class MetaPagina:
    titulo: str
    descripcion: str
    imagen: str  # URL absoluta


def _recortar(texto: str, largo: int = LARGO_DESCRIPCION) -> str:
    limpio = " ".join((texto or "").split())
    if len(limpio) <= largo:
        return limpio
    return limpio[: largo - 1].rstrip() + "…"


def _absoluta(origen: str, url: str | None) -> str:
    if not url:
        return f"{origen}{IMAGEN_GENERICA}"
    if re.match(r"^https?://", url, re.IGNORECASE):
        return url
    return f"{origen}{url if url.startswith('/') else '/' + url}"


def _url_de_archivo(campo, nombre: str | None) -> str | None:
    """URL pública de un archivo guardado, a partir de su nombre en el almacenamiento."""
    if not nombre:
        return None
    try:
        return campo.storage.url(nombre)
    except Exception:
        return None


def meta_generica(origen: str) -> MetaPagina:
    return MetaPagina(TITULO_GENERICO, DESCRIPCION_GENERICA, f"{origen}{IMAGEN_GENERICA}")


def meta_de_ruta(path: str, origen: str) -> MetaPagina:
    """Metaetiquetas de la ruta: las del producto o puesto públicos, o las genéricas.

    Una consulta como máximo. Si el objeto no existe o no es público, devuelve las genéricas:
    desde aquí nunca se responde 404 (esa decisión es de la SPA) ni se filtra un dato privado.
    """
    coincidencia = _RUTA_PRODUCTO.match(path)
    if coincidencia:
        foto = ImagenProducto.objects.filter(id_producto=OuterRef("pk")).order_by("orden", "id")
        producto = (
            Producto.objects.filter(
                pk=int(coincidencia.group(1)),
                estado=Producto.Estado.ACTIVO,
                id_puesto__estado=Puesto.Estado.ACTIVO,
            )
            .annotate(_foto=Subquery(foto.values("archivo")[:1]))
            .only("nombre", "descripcion")
            .first()
        )
        if producto is None:
            return meta_generica(origen)
        campo = ImagenProducto._meta.get_field("archivo")
        return MetaPagina(
            f"{producto.nombre} · RioMarket",
            _recortar(producto.descripcion) or DESCRIPCION_GENERICA,
            _absoluta(origen, _url_de_archivo(campo, producto._foto)),
        )

    coincidencia = _RUTA_PUESTO.match(path)
    if coincidencia:
        puesto = (
            Puesto.objects.filter(pk=int(coincidencia.group(1)), estado=Puesto.Estado.ACTIVO)
            .only("nombre", "descripcion", "portada", "logo")
            .first()
        )
        if puesto is None:
            return meta_generica(origen)
        archivo = puesto.portada or puesto.logo
        url = None
        if archivo:
            try:
                url = archivo.url
            except Exception:
                url = None
        return MetaPagina(
            f"{puesto.nombre} · RioMarket",
            _recortar(puesto.descripcion) or DESCRIPCION_GENERICA,
            _absoluta(origen, url),
        )

    return meta_generica(origen)


def completar_index(html: str, *, origen: str, path: str) -> str:
    """Sustituye los marcadores de ``index.html`` por valores reales (todos escapados)."""
    meta = meta_de_ruta(path, origen)
    ruta = quote(path, safe="/%:@!$&'()*+,;=-._~")
    reemplazos = {
        "__OG_TITULO__": escape(meta.titulo),
        "__OG_DESCRIPCION__": escape(meta.descripcion),
        "__OG_IMAGEN__": escape(meta.imagen),
        "__ORIGEN__": escape(origen),
        "__RUTA__": escape(ruta),
    }
    # Una sola pasada: si el nombre de un producto contiene «__ORIGEN__» no se vuelve a sustituir.
    return _MARCADORES.sub(lambda m: reemplazos[m.group(0)], html)
