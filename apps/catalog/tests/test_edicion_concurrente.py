"""Hallazgo S-09: editar un producto no debe revertir una moderación ni pisar el stock."""

import pytest

from apps.catalog import services
from apps.catalog.models import Producto, Puesto

pytestmark = pytest.mark.django_db


def test_editar_el_nombre_no_revierte_un_bloqueo_posterior_a_la_lectura(vendedor, producto):
    copia_vieja = Producto.objects.get(pk=producto.pk)  # el vendedor abrió el formulario
    Producto.objects.filter(pk=producto.pk).update(estado=Producto.Estado.BLOQUEADO)  # admin

    services.actualizar_producto(producto=copia_vieja, usuario=vendedor, datos={"nombre": "Nuevo"})

    producto.refresh_from_db()
    assert producto.nombre == "Nuevo"
    assert producto.estado == Producto.Estado.BLOQUEADO


def test_editar_el_nombre_no_pisa_el_stock_descontado_por_un_pedido(vendedor, producto):
    copia_vieja = Producto.objects.get(pk=producto.pk)
    Producto.objects.filter(pk=producto.pk).update(stock=3)  # una venta descontó stock

    services.actualizar_producto(producto=copia_vieja, usuario=vendedor, datos={"nombre": "Nuevo"})

    producto.refresh_from_db()
    assert producto.stock == 3


def test_el_vendedor_no_desbloquea_con_una_copia_vieja(vendedor, producto):
    copia_vieja = Producto.objects.get(pk=producto.pk)
    Producto.objects.filter(pk=producto.pk).update(estado=Producto.Estado.BLOQUEADO)

    with pytest.raises(Exception, match="bloquear o desbloquear"):
        services.actualizar_producto(
            producto=copia_vieja, usuario=vendedor, datos={"estado": Producto.Estado.ACTIVO}
        )
    producto.refresh_from_db()
    assert producto.estado == Producto.Estado.BLOQUEADO


def test_editar_un_puesto_no_revierte_la_suspension(vendedor, puesto):
    copia_vieja = Puesto.objects.get(pk=puesto.pk)
    Puesto.objects.filter(pk=puesto.pk).update(estado=Puesto.Estado.SUSPENDIDO)

    services.actualizar_puesto(puesto=copia_vieja, usuario=vendedor, datos={"nombre": "Otro"})

    puesto.refresh_from_db()
    assert puesto.estado == Puesto.Estado.SUSPENDIDO
