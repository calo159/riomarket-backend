"""Fixtures del módulo de auditoría."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from tests.factories import UsuarioFactory

REGISTROS = "/api/audit/registros/"


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


@pytest.fixture
def vendedor():
    return UsuarioFactory(rol=Usuario.Rol.VENDEDOR)


def _cliente(usuario):
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


@pytest.fixture
def cliente_admin(admin):
    return _cliente(admin)


@pytest.fixture
def cliente_comprador(comprador):
    return _cliente(comprador)


@pytest.fixture
def cliente_vendedor(vendedor):
    return _cliente(vendedor)


@pytest.fixture
def cliente_anon():
    return APIClient()
