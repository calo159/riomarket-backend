"""``reordenar_imagenes`` actualiza en bloque y conserva la semántica anterior (R-13)."""

import pytest
from django.core.files.base import ContentFile
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.catalog import services
from apps.catalog.models import ImagenProducto
from tests.factories import ProductoFactory

pytestmark = pytest.mark.django_db


def _imagenes(producto, cantidad):
    return [
        ImagenProducto.objects.create(
            id_producto=producto, archivo=ContentFile(b"x", name=f"i{n}.jpg"), orden=n
        )
        for n in range(cantidad)
    ]


def test_reordena_segun_la_lista():
    producto = ProductoFactory()
    a, b, c = _imagenes(producto, 3)
    resultado = services.reordenar_imagenes(producto=producto, orden_ids=[c.pk, a.pk, b.pk])
    assert [i.pk for i in resultado] == [c.pk, a.pk, b.pk]
    assert [i.pk for i in producto.imagenes.all()] == [c.pk, a.pk, b.pk]


def test_ignora_ids_ajenos_y_conserva_la_posicion():
    producto = ProductoFactory()
    a, b = _imagenes(producto, 2)
    ajena = _imagenes(ProductoFactory(), 1)[0]
    services.reordenar_imagenes(producto=producto, orden_ids=[ajena.pk, b.pk])
    a.refresh_from_db()
    b.refresh_from_db()
    ajena.refresh_from_db()
    assert (b.orden, a.orden) == (1, 0)
    assert ajena.orden == 0


def test_consultas_constantes_con_muchas_imagenes():
    producto = ProductoFactory()
    imagenes = _imagenes(producto, 8)
    with CaptureQueriesContext(connection) as contexto:
        services.reordenar_imagenes(producto=producto, orden_ids=[i.pk for i in reversed(imagenes)])
    # Lectura de imágenes + un UPDATE en bloque (más SAVEPOINT/RELEASE de la transacción).
    sentencias = [q["sql"] for q in contexto.captured_queries]
    assert len([s for s in sentencias if s.lstrip().startswith("UPDATE")]) == 1
    assert len([s for s in sentencias if s.lstrip().startswith("SELECT")]) == 1
