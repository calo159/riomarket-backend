"""Fixtures del módulo de administración."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from tests.factories import PuestoFactory, UsuarioFactory, VendedorFactory


@pytest.fixture
def comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


@pytest.fixture
def vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
    VendedorFactory(id_usuario=usuario)
    return usuario


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def cliente_admin(admin):
    cliente = APIClient()
    cliente.force_authenticate(admin)
    return cliente


@pytest.fixture
def cliente_comprador(comprador):
    cliente = APIClient()
    cliente.force_authenticate(comprador)
    return cliente


@pytest.fixture
def cliente_vendedor(vendedor):
    cliente = APIClient()
    cliente.force_authenticate(vendedor)
    return cliente


@pytest.fixture
def cliente_anon():
    return APIClient()


@pytest.fixture
def puesto(vendedor):
    return PuestoFactory(id_vendedor=vendedor)
