"""Fixtures del módulo de pagos."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.catalog.models import Categoria
from apps.catalog.services import asignar_categoria
from apps.orders import services as orders_services
from apps.orders.models import Pedido
from tests.factories import ProductoFactory, PuestoFactory, UsuarioFactory, VendedorFactory

PAGOS = "/api/payments/pagos/"
WEBHOOK = "/api/payments/webhook/"


@pytest.fixture
def comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


@pytest.fixture
def otro_comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


@pytest.fixture
def vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")
    VendedorFactory(id_usuario=usuario)
    return usuario


@pytest.fixture
def otro_vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")
    VendedorFactory(id_usuario=usuario)
    return usuario


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def puesto(vendedor):
    return PuestoFactory(
        id_vendedor=vendedor,
        ofrece_domicilio=True,
        latitud="11.544000",
        longitud="-72.907000",
    )


@pytest.fixture
def producto(puesto):
    categoria = Categoria.objects.create(nombre=f"Cat-{puesto.pk}")
    asignar_categoria(puesto=puesto, categoria=categoria)
    return ProductoFactory(id_puesto=puesto, id_categoria=categoria, precio=Decimal("10000.00"))


@pytest.fixture
def pedido(comprador, puesto, producto):
    return orders_services.crear_pedido(
        usuario=comprador,
        datos={
            "id_puesto": puesto,
            "tipo_entrega": Pedido.TipoEntrega.RETIRO,
            "items": [{"id_producto": producto, "cantidad": 2}],
        },
    )


def _cliente(usuario):
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


@pytest.fixture
def cliente_comprador(comprador):
    return _cliente(comprador)


@pytest.fixture
def cliente_vendedor(vendedor):
    return _cliente(vendedor)


@pytest.fixture
def cliente_admin(admin):
    return _cliente(admin)


@pytest.fixture
def cliente_anon():
    return APIClient()
