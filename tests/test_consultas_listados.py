"""Los listados de más tráfico no hacen N+1: las consultas no crecen con las filas (R-04..R-12)."""

import pytest
from django.core.files.base import ContentFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.catalog.models import ImagenProducto
from tests.factories import (
    ItemPedidoFactory,
    PedidoFactory,
    ProductoFactory,
    PuestoFactory,
    ResenaFactory,
    UsuarioFactory,
    VendedorFactory,
)

pytestmark = pytest.mark.django_db


def _contar(cliente, url):
    with CaptureQueriesContext(connection) as contexto:
        respuesta = cliente.get(url)
    assert respuesta.status_code == 200, respuesta.content
    return len(contexto)


def _cliente(usuario=None):
    cliente = APIClient()
    if usuario is not None:
        cliente.force_authenticate(usuario)
    return cliente


def _sembrar_catalogo(n):
    for _ in range(n):
        vendedor = UsuarioFactory(rol="vendedor")
        VendedorFactory(id_usuario=vendedor)
        puesto = PuestoFactory(id_vendedor=vendedor)
        producto = ProductoFactory(id_puesto=puesto)
        for orden in range(2):
            ImagenProducto.objects.create(
                id_producto=producto, archivo=ContentFile(b"x", name="i.jpg"), orden=orden
            )
        ResenaFactory(id_puesto=puesto)


@pytest.mark.parametrize(
    "url",
    [
        "/api/catalog/productos/",
        "/api/catalog/puestos/",
        "/api/reviews/resenas/",
        "/api/catalog/categorias/",
    ],
)
@pytest.mark.parametrize("rol", [None, "administrador"])
def test_catalogo_no_crece_con_las_filas(url, rol):
    usuario = UsuarioFactory(rol=rol) if rol else None
    cliente = _cliente(usuario)
    _sembrar_catalogo(2)
    pocas = _contar(cliente, url)
    _sembrar_catalogo(8)
    muchas = _contar(cliente, url)
    print(f"MEDICION {url} ({rol}): 2 filas={pocas}, 10 filas={muchas}")
    assert muchas == pocas


@pytest.mark.parametrize("rol", ["vendedor", "administrador"])
def test_pedidos_de_vendedor_y_admin_no_crecen(rol):
    usuario = UsuarioFactory(rol=rol)
    if rol == "vendedor":
        VendedorFactory(id_usuario=usuario)
    puesto = PuestoFactory(
        id_vendedor=usuario if rol == "vendedor" else UsuarioFactory(rol="vendedor")
    )
    cliente = _cliente(usuario)

    def sembrar(n):
        for _ in range(n):
            pedido = PedidoFactory(id_puesto=puesto)
            ItemPedidoFactory(id_pedido=pedido)

    sembrar(2)
    pocas = _contar(cliente, "/api/orders/pedidos/")
    sembrar(8)
    muchas = _contar(cliente, "/api/orders/pedidos/")
    print(f"MEDICION pedidos ({rol}): 2 filas={pocas}, 10 filas={muchas}")
    assert muchas == pocas


def test_producto_trae_datos_del_puesto_para_las_tarjetas():
    """El listado de productos expone nombre, domicilio y calificación del puesto (solo lectura)."""
    vendedor = UsuarioFactory(rol="vendedor")
    VendedorFactory(id_usuario=vendedor)
    puesto = PuestoFactory(
        id_vendedor=vendedor,
        nombre="Frutas del Caribe",
        ofrece_domicilio=True,
        latitud="11.544000",
        longitud="-72.907000",
    )
    ProductoFactory(id_puesto=puesto)
    sin_resenas = PuestoFactory(id_vendedor=vendedor, nombre="Sin reseñas", ofrece_domicilio=False)
    ProductoFactory(id_puesto=sin_resenas)
    ResenaFactory(id_puesto=puesto, calificacion=5)
    ResenaFactory(id_puesto=puesto, calificacion=4)

    respuesta = _cliente().get("/api/catalog/productos/")

    assert respuesta.status_code == 200
    por_puesto = {p["puesto_nombre"]: p for p in respuesta.data["results"]}
    assert por_puesto["Frutas del Caribe"]["puesto_ofrece_domicilio"] is True
    assert por_puesto["Frutas del Caribe"]["puesto_calificacion"] == 4.5
    assert por_puesto["Sin reseñas"]["puesto_ofrece_domicilio"] is False
    assert por_puesto["Sin reseñas"]["puesto_calificacion"] is None
