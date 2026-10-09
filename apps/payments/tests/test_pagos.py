"""Tests del módulo de pagos (Fase 4)."""

from decimal import Decimal

import pytest

from apps.accounts.models import Usuario, Vendedor
from apps.catalog.models import Categoria, Producto, Puesto
from apps.catalog.services import asignar_categoria
from apps.orders import services as orders_services
from apps.payments import services as pagos_services
from apps.payments.models import Pago


@pytest.fixture
def datos_base(db):
    comprador = Usuario.objects.create_user(
        correo="comprador@test.com",
        password="Password123!",
        nombre="Comprador",
        celular="3001111111",
        rol=Usuario.Rol.COMPRADOR,
    )
    vendedor_user = Usuario.objects.create_user(
        correo="vendedor@test.com",
        password="Password123!",
        nombre="Vendedor",
        celular="3002222222",
        rol=Usuario.Rol.VENDEDOR,
    )
    Vendedor.objects.create(
        id_usuario=vendedor_user, estado_verificacion=Vendedor.EstadoVerificacion.APROBADO
    )
    puesto = Puesto.objects.create(
        id_vendedor=vendedor_user,
        nombre="Puesto Test",
        descripcion="desc",
        direccion="dir",
        horario="8-17",
        ofrece_domicilio=True,
        latitud="11.5",
        longitud="-72.9",
    )
    cat = Categoria.objects.create(nombre="Comida")
    asignar_categoria(puesto=puesto, categoria=cat)
    producto = Producto.objects.create(
        id_puesto=puesto,
        id_categoria=cat,
        nombre="Producto",
        descripcion="desc",
        precio=Decimal("10000.00"),
        stock=10,
    )
    return {
        "comprador": comprador,
        "vendedor_user": vendedor_user,
        "puesto": puesto,
        "cat": cat,
        "producto": producto,
    }


@pytest.mark.django_db
def test_crear_pago_retiro(api_client, datos_base):
    datos_pedido = {
        "id_puesto": datos_base["puesto"],
        "tipo_entrega": "retiro",
        "items": [{"id_producto": datos_base["producto"], "cantidad": 2}],
    }
    pedido = orders_services.crear_pedido(usuario=datos_base["comprador"], datos=datos_pedido)
    pago = pagos_services.crear_pago(
        pedido=pedido,
        usuario=datos_base["comprador"],
        datos={"metodo_pago": Pago.MetodoPago.SIMULADO},
    )
    assert pago.subtotal_pedido == Decimal("20000.00")
    assert pago.tarifa_domicilio_aplicada == Decimal("0.00")
    assert pago.comision_plataforma == Decimal("0.00")
    assert pago.total_cobrado == Decimal("20000.00")
    assert pago.estado == Pago.Estado.PENDIENTE


@pytest.mark.django_db
def test_crear_pago_domicilio_con_comision(settings, api_client, datos_base):
    settings.PLATFORM_COMMISSION_PERCENTAGE = Decimal("10.00")
    settings.DOMICILIO_TARIFA_BASE = Decimal("3000.00")
    datos_pedido = {
        "id_puesto": datos_base["puesto"],
        "tipo_entrega": "domicilio",
        "direccion_entrega": "Calle 1 #2-3",
        "items": [{"id_producto": datos_base["producto"], "cantidad": 2}],
    }
    pedido = orders_services.crear_pedido(usuario=datos_base["comprador"], datos=datos_pedido)
    pago = pagos_services.crear_pago(
        pedido=pedido, usuario=datos_base["comprador"], datos={"metodo_pago": Pago.MetodoPago.NEQUI}
    )
    assert pago.subtotal_pedido == Decimal("20000.00")
    assert pago.tarifa_domicilio_aplicada == Decimal("3000.00")
    assert pago.comision_plataforma == Decimal("2000.00")
    assert pago.total_cobrado == Decimal("23000.00")
    assert pago.metodo_pago == Pago.MetodoPago.NEQUI


@pytest.mark.django_db
def test_simular_pago_aprobar(api_client, datos_base):
    datos_pedido = {
        "id_puesto": datos_base["puesto"],
        "items": [{"id_producto": datos_base["producto"], "cantidad": 1}],
    }
    pedido = orders_services.crear_pedido(usuario=datos_base["comprador"], datos=datos_pedido)
    pago = pagos_services.crear_pago(pedido=pedido, usuario=datos_base["comprador"], datos={})
    pago = pagos_services.simular_pago(
        pago=pago, usuario=datos_base["comprador"], datos={"accion": "aprobar"}
    )
    assert pago.estado == Pago.Estado.APROBADO
    assert pago.referencia_gateway


@pytest.mark.django_db
def test_simular_pago_rechazar(api_client, datos_base):
    datos_pedido = {
        "id_puesto": datos_base["puesto"],
        "items": [{"id_producto": datos_base["producto"], "cantidad": 1}],
    }
    pedido = orders_services.crear_pedido(usuario=datos_base["comprador"], datos=datos_pedido)
    pago = pagos_services.crear_pago(pedido=pedido, usuario=datos_base["comprador"], datos={})
    pago = pagos_services.simular_pago(
        pago=pago, usuario=datos_base["comprador"], datos={"accion": "rechazar"}
    )
    assert pago.estado == Pago.Estado.RECHAZADO


@pytest.mark.django_db
def test_no_puede_crear_pago_otro_usuario(api_client, datos_base):
    otro = Usuario.objects.create_user(
        correo="otro@test.com",
        password="Password123!",
        nombre="Otro",
        celular="3009999999",
        rol=Usuario.Rol.COMPRADOR,
    )
    datos_pedido = {
        "id_puesto": datos_base["puesto"],
        "items": [{"id_producto": datos_base["producto"], "cantidad": 1}],
    }
    pedido = orders_services.crear_pedido(usuario=datos_base["comprador"], datos=datos_pedido)
    from django.core.exceptions import PermissionDenied
    from rest_framework import exceptions

    with pytest.raises((PermissionDenied, exceptions.PermissionDenied, Exception)):
        pagos_services.crear_pago(pedido=pedido, usuario=otro, datos={})
