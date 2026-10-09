"""Fixtures del módulo de promociones/cupones."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.catalog.models import Categoria
from apps.catalog.services import asignar_categoria
from tests.factories import (
    CuponFactory,
    ProductoFactory,
    PuestoFactory,
    UsuarioFactory,
    VendedorFactory,
)

CUPONES = "/api/promotions/cupones/"


@pytest.fixture
def comprador():
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
    return PuestoFactory(id_vendedor=vendedor)


@pytest.fixture
def otro_puesto(otro_vendedor):
    return PuestoFactory(id_vendedor=otro_vendedor)


@pytest.fixture
def cupon(puesto):
    """Cupón de monto fijo de un puesto (para ejercitar permisos)."""
    return CuponFactory(id_puesto=puesto, valor=Decimal("2000.00"))


@pytest.fixture
def cupon_global(admin):
    return CuponFactory(id_puesto=None)


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
def cliente_otro_vendedor(otro_vendedor):
    return _cliente(otro_vendedor)


@pytest.fixture
def cliente_admin(admin):
    return _cliente(admin)


@pytest.fixture
def cliente_anon():
    return APIClient()


@pytest.fixture
def producto(puesto):
    categoria = Categoria.objects.create(nombre=f"Cat-{puesto.pk}")
    asignar_categoria(puesto=puesto, categoria=categoria)
    return ProductoFactory(id_puesto=puesto, id_categoria=categoria, precio=Decimal("5000.00"))
