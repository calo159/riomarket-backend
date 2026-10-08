"""Fixtures específicas del catálogo: roles y objetos base del marketplace."""

import base64

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.catalog.services import asignar_categoria
from tests.factories import CategoriaFactory, ProductoFactory, PuestoFactory, UsuarioFactory

# PNG 1x1 válido (verificable por Pillow)
PNG_BYTES = base64.b64decode(
    b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture
def imagen_png():
    return PNG_BYTES


@pytest.fixture
def vendedor():
    return UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")


@pytest.fixture
def otro_vendedor():
    return UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")


@pytest.fixture
def comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def cliente_anon():
    return APIClient()


@pytest.fixture
def cliente_vendedor(vendedor):
    cliente = APIClient()
    cliente.force_authenticate(vendedor)
    return cliente


@pytest.fixture
def cliente_otro_vendedor(otro_vendedor):
    cliente = APIClient()
    cliente.force_authenticate(otro_vendedor)
    return cliente


@pytest.fixture
def cliente_comprador(comprador):
    cliente = APIClient()
    cliente.force_authenticate(comprador)
    return cliente


@pytest.fixture
def cliente_admin(admin):
    cliente = APIClient()
    cliente.force_authenticate(admin)
    return cliente


@pytest.fixture
def categoria():
    return CategoriaFactory()


@pytest.fixture
def puesto(vendedor, categoria):
    """Puesto activo del vendedor con UNA categoría ya asignada (regla 2)."""
    puesto = PuestoFactory(id_vendedor=vendedor)
    asignar_categoria(puesto=puesto, categoria=categoria)
    return puesto


@pytest.fixture
def producto(puesto, categoria):
    return ProductoFactory(id_puesto=puesto, id_categoria=categoria)
