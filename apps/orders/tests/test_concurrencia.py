"""Hallazgos R-01/S-07/L-03 (doble reposición de stock) y S-08/L-01 (cupón al cancelar)."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.orders import services
from apps.orders.models import Pedido
from apps.promotions.models import UsoCupon
from tests.factories import CuponFactory

from .test_services import datos_pedido


@pytest.mark.django_db
class TestCancelarUnaSolaVez:
    def test_dos_cancelaciones_con_instancias_viejas_reponen_el_stock_una_vez(
        self, comprador, puesto, producto
    ):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 4)])
        )
        primera = Pedido.objects.get(pk=pedido.pk)
        segunda = Pedido.objects.get(pk=pedido.pk)  # lectura anterior a la cancelación

        services.cancelar_pedido(pedido=primera, usuario=comprador)
        with pytest.raises(DjangoValidationError):
            services.cancelar_pedido(pedido=segunda, usuario=comprador)

        producto.refresh_from_db()
        assert producto.stock == 10

    def test_reponer_stock_no_pisa_una_venta_concurrente(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 4)])
        )
        # Otra compra descuenta 2 mientras el servicio ya cargó el producto (stock 6).
        from apps.catalog.models import Producto

        Producto.objects.filter(pk=producto.pk).update(stock=4)
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        producto.refresh_from_db()
        assert producto.stock == 8


@pytest.mark.django_db
class TestCuponAlCancelar:
    def test_cancelar_libera_el_uso_del_cupon(self, comprador, puesto, producto):
        cupon = CuponFactory(id_puesto=puesto, valor=Decimal("500.00"), usos_totales=1)
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(puesto, [(producto, 2)], codigo_cupon=cupon.codigo),
        )
        assert UsoCupon.objects.filter(id_cupon=cupon).count() == 1

        services.cancelar_pedido(pedido=pedido, usuario=comprador)

        assert UsoCupon.objects.filter(id_cupon=cupon).count() == 0
        # El cupón vuelve a estar disponible (antes decía "alcanzó su límite de usos").
        otro = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(puesto, [(producto, 1)], codigo_cupon=cupon.codigo),
        )
        assert otro.descuento_cupon == Decimal("500.00")


@pytest.mark.django_db(transaction=True)
class TestValidarCuponEnPostgres:
    def test_validar_cupon_bloquea_dentro_de_una_transaccion(self, comprador, puesto, monkeypatch):
        """En PostgreSQL ``select_for_update`` fuera de ``atomic`` lanza error (R-02/L-02).

        SQLite no lo detecta, así que se comprueba que el bloqueo se pida con la
        transacción ya abierta.
        """
        from django.db import connection
        from django.db.models import QuerySet

        from apps.promotions import services as promos

        en_transaccion = []
        original = QuerySet.select_for_update

        def espia(self, *args, **kwargs):
            en_transaccion.append(connection.in_atomic_block)
            return original(self, *args, **kwargs)

        monkeypatch.setattr(QuerySet, "select_for_update", espia)
        cupon = CuponFactory(id_puesto=puesto, valor=Decimal("500.00"))
        resultado = promos.validar_cupon(
            usuario=comprador, codigo=cupon.codigo, puesto=puesto, subtotal=Decimal("5000.00")
        )
        assert resultado["descuento"] == Decimal("500.00")
        assert en_transaccion == [True]
