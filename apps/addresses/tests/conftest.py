"""Fixtures del módulo de direcciones."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from tests.factories import DireccionFactory, UsuarioFactory, VendedorFactory

DIRECCIONES = "/api/addresses/direcciones/"


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
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def direccion(comprador):
    return DireccionFactory(id_usuario=comprador)


def _cliente(usuario):
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


@pytest.fixture
def cliente_comprador(comprador):
    return _cliente(comprador)


@pytest.fixture
def cliente_otro_comprador(otro_comprador):
    return _cliente(otro_comprador)


@pytest.fixture
def cliente_vendedor(vendedor):
    return _cliente(vendedor)


@pytest.fixture
def cliente_admin(admin):
    return _cliente(admin)


@pytest.fixture
def cliente_anon():
    return APIClient()
