"""Fixtures del módulo de pedidos: roles, puestos y productos base."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from tests.factories import ProductoFactory, PuestoFactory, UsuarioFactory, VendedorFactory

PEDIDOS = "/api/orders/pedidos/"


@pytest.fixture
def comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


@pytest.fixture
def cliente_comprador(comprador):
    cliente = APIClient()
    cliente.force_authenticate(comprador)
    return cliente


@pytest.fixture
def vendedor():
    """Vendedor con identidad aprobada (dueño del puesto de los tests)."""
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")
    VendedorFactory(id_usuario=usuario)
    return usuario


@pytest.fixture
def cliente_vendedor(vendedor):
    cliente = APIClient()
    cliente.force_authenticate(vendedor)
    return cliente


@pytest.fixture
def otro_vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password="ClaveSegura1!")
    VendedorFactory(id_usuario=usuario)
    return usuario


@pytest.fixture
def cliente_otro_vendedor(otro_vendedor):
    cliente = APIClient()
    cliente.force_authenticate(otro_vendedor)
    return cliente


@pytest.fixture
def admin():
    return UsuarioFactory(rol=Usuario.Rol.ADMINISTRADOR)


@pytest.fixture
def cliente_admin(admin):
    cliente = APIClient()
    cliente.force_authenticate(admin)
    return cliente


@pytest.fixture
def cliente_anon():
    return APIClient()


@pytest.fixture
def puesto(vendedor):
    return PuestoFactory(id_vendedor=vendedor)


@pytest.fixture
def puesto_domicilio(vendedor):
    """Puesto que SÍ ofrece domicilio (con coordenadas, regla 3)."""
    return PuestoFactory(
        id_vendedor=vendedor,
        ofrece_domicilio=True,
        latitud="11.544000",
        longitud="-72.907000",
    )


@pytest.fixture
def producto(puesto):
    return ProductoFactory(id_puesto=puesto)


@pytest.fixture
def producto_domicilio(puesto_domicilio):
    return ProductoFactory(id_puesto=puesto_domicilio)


@pytest.fixture
def aprobar_pago():
    """Crea un pago simulado y lo deja APROBADO (regla de negocio de Fase 4)."""
    from apps.payments import services as pagos_services
    from apps.payments.models import Pago

    def _aprobar(pedido, usuario):
        pago = pagos_services.crear_pago(
            pedido=pedido,
            usuario=usuario,
            datos={"metodo_pago": Pago.MetodoPago.SIMULADO},
        )
        return pagos_services.simular_pago(pago=pago, usuario=usuario, datos={"accion": "aprobar"})

    return _aprobar
