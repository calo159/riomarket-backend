"""Fixtures del módulo de reseñas."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.catalog.models import Categoria
from apps.catalog.services import asignar_categoria
from apps.orders import services as orders_services
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from tests.factories import (
    ProductoFactory,
    PuestoFactory,
    ResenaFactory,
    UsuarioFactory,
    VendedorFactory,
)

RESENAS = "/api/reviews/resenas/"
PUESTOS = "/api/catalog/puestos/"


def _flujo_entregado(pedido, comprador, vendedor):
    """Camina el pedido hasta entregado (aprueba el pago primero)."""
    pago = pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
    )
    pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "aprobar"})
    orders_services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    orders_services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
    orders_services.marcar_enviado(pedido=pedido, usuario=vendedor)
    orders_services.marcar_entregado(pedido=pedido, usuario=comprador)
    return pedido


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
    return PuestoFactory(id_vendedor=vendedor)


@pytest.fixture
def otro_puesto(otro_vendedor):
    return PuestoFactory(id_vendedor=otro_vendedor)


@pytest.fixture
def producto(puesto):
    categoria = Categoria.objects.create(nombre=f"Cat-{puesto.pk}")
    asignar_categoria(puesto=puesto, categoria=categoria)
    return ProductoFactory(id_puesto=puesto, id_categoria=categoria, precio=Decimal("1000.00"))


@pytest.fixture
def pedido_entregado(comprador, vendedor, puesto, producto):
    pedido = orders_services.crear_pedido(
        usuario=comprador,
        datos={
            "id_puesto": puesto,
            "tipo_entrega": Pedido.TipoEntrega.RETIRO,
            "items": [{"id_producto": producto, "cantidad": 1}],
        },
    )
    return _flujo_entregado(pedido, comprador, vendedor)


@pytest.fixture
def resena(comprador, puesto):
    return ResenaFactory(id_usuario=comprador, id_puesto=puesto)


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
def cliente_otro_vendedor(otro_vendedor):
    return _cliente(otro_vendedor)


@pytest.fixture
def cliente_admin(admin):
    return _cliente(admin)


@pytest.fixture
def cliente_anon():
    return APIClient()
