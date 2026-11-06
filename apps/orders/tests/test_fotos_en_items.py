"""El pedido muestra la foto de cada producto, sin una consulta por línea (revisión de diseño)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.test.utils import override_settings as ajustes

from apps.catalog.models import ImagenProducto
from apps.orders import services
from tests.factories import ProductoFactory

pytestmark = pytest.mark.django_db
PEDIDOS = "/api/orders/pedidos/"

# PNG de 1x1 píxel.
PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15"
    b"\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _pedido_con_fotos(comprador, puesto, lineas, tmp_path):
    productos = []
    for _ in range(lineas):
        producto = ProductoFactory(id_puesto=puesto, stock=50)
        ImagenProducto.objects.create(
            id_producto=producto, archivo=SimpleUploadedFile("f.png", PNG, "image/png")
        )
        productos.append(producto)
    datos = {
        "id_puesto": puesto,
        "tipo_entrega": "retiro",
        "items": [{"id_producto": p, "cantidad": 1} for p in productos],
    }
    return services.crear_pedido(usuario=comprador, datos=datos), productos


def test_el_detalle_trae_la_foto_de_cada_producto(cliente_comprador, comprador, puesto, tmp_path):
    with ajustes(MEDIA_ROOT=tmp_path):
        pedido, _ = _pedido_con_fotos(comprador, puesto, 2, tmp_path)

        respuesta = cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/")

    assert respuesta.status_code == 200
    fotos = [item["imagen"] for item in respuesta.json()["items"]]
    assert len(fotos) == 2
    assert all(f and f.startswith("/media/") for f in fotos)


def test_un_producto_sin_foto_da_imagen_nula(cliente_comprador, comprador, puesto):
    producto = ProductoFactory(id_puesto=puesto, stock=5)
    pedido = services.crear_pedido(
        usuario=comprador,
        datos={
            "id_puesto": puesto,
            "tipo_entrega": "retiro",
            "items": [{"id_producto": producto, "cantidad": 1}],
        },
    )

    respuesta = cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/")

    assert respuesta.json()["items"][0]["imagen"] is None


def test_la_respuesta_de_crear_no_hace_consultas_por_foto(cliente_comprador, puesto):
    """Crear un pedido sigue costando una consulta extra por línea como máximo (R-03)."""
    productos = [ProductoFactory(id_puesto=puesto, stock=50) for _ in range(6)]

    def crear(n):
        with CaptureQueriesContext(connection) as contexto:
            r = cliente_comprador.post(
                PEDIDOS,
                {
                    "id_puesto": puesto.pk,
                    "tipo_entrega": "retiro",
                    "items": [{"id_producto": p.pk, "cantidad": 1} for p in productos[:n]],
                },
                format="json",
            )
        assert r.status_code == 201
        assert all(item["imagen"] is None for item in r.json()["items"])
        return len(contexto)

    assert crear(6) - crear(1) <= 5 * 3


def test_el_listado_no_crece_con_las_lineas(cliente_comprador, comprador, puesto, tmp_path):
    with ajustes(MEDIA_ROOT=tmp_path):
        _pedido_con_fotos(comprador, puesto, 1, tmp_path)
        with CaptureQueriesContext(connection) as pocas:
            assert cliente_comprador.get(PEDIDOS).status_code == 200
        _pedido_con_fotos(comprador, puesto, 8, tmp_path)
        with CaptureQueriesContext(connection) as muchas:
            respuesta = cliente_comprador.get(PEDIDOS)

    assert respuesta.status_code == 200
    # Con más líneas, las consultas son las mismas: las fotos se precargan en bloque.
    assert len(muchas) == len(pocas)
