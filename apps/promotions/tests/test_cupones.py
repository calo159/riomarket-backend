"""Pruebas de cupones: servicios, integración con pedidos/pagos y endpoints."""

from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from rest_framework import status

from apps.promotions import services
from apps.promotions.models import Cupon, UsoCupon
from tests.factories import CuponFactory, UsuarioFactory

from .conftest import CUPONES


def _datos(puesto=None, **extra):
    datos = {
        "codigo": "PROMO10",
        "id_puesto": puesto,
        "tipo_descuento": Cupon.TipoDescuento.MONTO,
        "valor": Decimal("2000.00"),
    }
    datos.update(extra)
    return datos


@pytest.mark.django_db
class TestCrear:
    def test_vendedor_crea_para_su_puesto(self, vendedor, puesto):
        cupon = services.crear_cupon(usuario=vendedor, datos=_datos(puesto))
        assert cupon.codigo == "PROMO10"
        assert cupon.id_puesto_id == puesto.pk

    def test_codigo_va_en_mayusculas(self, vendedor, puesto):
        cupon = services.crear_cupon(usuario=vendedor, datos=_datos(puesto, codigo=" promo10 "))
        assert cupon.codigo == "PROMO10"

    def test_vendedor_no_crea_global(self, vendedor):
        with pytest.raises(ValidationError):
            services.crear_cupon(usuario=vendedor, datos=_datos(None))

    def test_solo_admin_crea_global(self, admin):
        cupon = services.crear_cupon(usuario=admin, datos=_datos(None))
        assert cupon.id_puesto_id is None

    def test_vendedor_no_crea_para_puesto_ajeno(self, vendedor, otro_puesto):
        with pytest.raises(ValidationError):
            services.crear_cupon(usuario=vendedor, datos=_datos(otro_puesto))

    def test_codigo_duplicado_rechazado(self, vendedor, puesto):
        services.crear_cupon(usuario=vendedor, datos=_datos(puesto))
        with pytest.raises(ValidationError):
            services.crear_cupon(usuario=vendedor, datos=_datos(puesto))

    def test_comprador_no_crea(self, comprador):
        with pytest.raises(PermissionDenied):
            services.crear_cupon(usuario=comprador, datos=_datos(None))

    def test_porcentaje_mayor_100_invalido(self, vendedor, puesto):
        with pytest.raises(ValidationError):
            services.crear_cupon(
                usuario=vendedor,
                datos=_datos(
                    puesto, tipo_descuento=Cupon.TipoDescuento.PORCENTAJE, valor=Decimal("150")
                ),
            )


@pytest.mark.django_db
class TestActualizar:
    def test_dueno_edita(self, vendedor, cupon):
        actualizado = services.actualizar_cupon(
            cupon=cupon, usuario=vendedor, datos={"activo": False, "valor": Decimal("1000.00")}
        )
        assert actualizado.activo is False
        assert actualizado.valor == Decimal("1000.00")

    def test_otro_vendedor_no_edita(self, otro_vendedor, cupon):
        with pytest.raises(PermissionDenied):
            services.actualizar_cupon(cupon=cupon, usuario=otro_vendedor, datos={"activo": False})

    def test_admin_edita_global(self, admin, cupon_global):
        actualizado = services.actualizar_cupon(
            cupon=cupon_global, usuario=admin, datos={"valor": Decimal("3000.00")}
        )
        assert actualizado.valor == Decimal("3000.00")


@pytest.mark.django_db
class TestVisibilidad:
    def test_anonimo_no_ve(self, cupon):
        qs = services.visibles_cupones(None, Cupon.objects.all())
        assert qs.count() == 0

    def test_comprador_no_ve(self, comprador, cupon):
        qs = services.visibles_cupones(comprador, Cupon.objects.all())
        assert qs.count() == 0

    def test_vendedor_ve_solo_sus_cupones(self, vendedor, cupon, otro_puesto):
        CuponFactory(id_puesto=otro_puesto)
        qs = services.visibles_cupones(vendedor, Cupon.objects.all())
        assert qs.count() == 1
        assert qs.get().pk == cupon.pk

    def test_admin_ve_todos(self, admin, cupon, cupon_global):
        qs = services.visibles_cupones(admin, Cupon.objects.all())
        assert qs.count() == 2


@pytest.mark.django_db
class TestValidacion:
    def test_monto_ok(self, cupon, comprador):
        resultado = services.validar_cupon(
            usuario=comprador,
            codigo=cupon.codigo,
            puesto=cupon.id_puesto,
            subtotal=Decimal("5000.00"),
        )
        assert resultado["descuento"] == Decimal("2000.00")

    def test_no_aplica_a_otro_puesto(self, cupon, comprador, otro_puesto):
        with pytest.raises(ValidationError):
            services.validar_cupon(
                usuario=comprador,
                codigo=cupon.codigo,
                puesto=otro_puesto,
                subtotal=Decimal("5000.00"),
            )

    def test_inactivo_invalido(self, comprador, cupon):
        services.actualizar_cupon(
            cupon=cupon, usuario=cupon.id_puesto.id_vendedor, datos={"activo": False}
        )
        with pytest.raises(ValidationError):
            services.validar_cupon(
                usuario=comprador,
                codigo=cupon.codigo,
                puesto=cupon.id_puesto,
                subtotal=Decimal("5000.00"),
            )

    def test_monto_minimo(self, comprador, cupon, vendedor):
        services.actualizar_cupon(
            cupon=cupon, usuario=vendedor, datos={"monto_minimo_pedido": Decimal("10000.00")}
        )
        with pytest.raises(ValidationError):
            services.validar_cupon(
                usuario=comprador,
                codigo=cupon.codigo,
                puesto=cupon.id_puesto,
                subtotal=Decimal("5000.00"),
            )

    def test_porcentaje_con_tope(self, comprador, cupon, vendedor):
        cupon = services.actualizar_cupon(
            cupon=cupon,
            usuario=vendedor,
            datos={
                "tipo_descuento": Cupon.TipoDescuento.PORCENTAJE,
                "valor": Decimal("50"),
                "tope_descuento": Decimal("800.00"),
            },
        )
        resultado = services.validar_cupon(
            usuario=comprador,
            codigo=cupon.codigo,
            puesto=cupon.id_puesto,
            subtotal=Decimal("5000.00"),
        )
        assert resultado["descuento"] == Decimal("800.00")

    def test_descuento_no_supera_subtotal(self, comprador, cupon):
        resultado = services.validar_cupon(
            usuario=comprador,
            codigo=cupon.codigo,
            puesto=cupon.id_puesto,
            subtotal=Decimal("500.00"),
        )
        assert resultado["descuento"] == Decimal("500.00")

    def test_limite_total(self, comprador, cupon, vendedor):
        cupon = services.actualizar_cupon(cupon=cupon, usuario=vendedor, datos={"usos_totales": 1})
        services.validar_cupon(
            usuario=comprador,
            codigo=cupon.codigo,
            puesto=cupon.id_puesto,
            subtotal=Decimal("5000.00"),
        )
        from tests.factories import PedidoFactory, UsoCuponFactory

        darios = PedidoFactory(id_comprador=UsuarioFactory())
        UsoCuponFactory(
            id_cupon=cupon,
            id_usuario=comprador,
            id_pedido=darios,
            descuento_aplicado=Decimal("0.00"),
        )
        with pytest.raises(ValidationError):
            services.validar_cupon(
                usuario=comprador,
                codigo=cupon.codigo,
                puesto=cupon.id_puesto,
                subtotal=Decimal("5000.00"),
            )

    def test_codigo_inexistente(self, comprador, puesto):
        with pytest.raises(ValidationError):
            services.validar_cupon(
                usuario=comprador, codigo="NOEXISTE", puesto=puesto, subtotal=Decimal("5000.00")
            )


@pytest.mark.django_db
class TestPedidosIntegracion:
    def test_pedido_con_cupon_aplica_descuento(self, comprador, producto, cupon):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido

        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": producto.id_puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "codigo_cupon": cupon.codigo,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        assert pedido.subtotal == Decimal("5000.00")
        assert pedido.descuento_cupon == Decimal("2000.00")
        assert pedido.total == Decimal("3000.00")
        assert UsoCupon.objects.filter(id_pedido=pedido).count() == 1

    def test_sin_cupon_ok(self, comprador, producto):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido

        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": producto.id_puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        assert pedido.descuento_cupon == Decimal("0.00")
        assert pedido.total == pedido.subtotal
        assert UsoCupon.objects.filter(id_pedido=pedido).count() == 0

    def test_cupon_de_otro_puesto_no_aplica(self, comprador, producto, otro_puesto):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido

        cupon_ajeno = CuponFactory(id_puesto=otro_puesto)
        with pytest.raises(ValidationError):
            orders_services.crear_pedido(
                usuario=comprador,
                datos={
                    "id_puesto": producto.id_puesto,
                    "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                    "codigo_cupon": cupon_ajeno.codigo,
                    "items": [{"id_producto": producto, "cantidad": 1}],
                },
            )

    def test_limite_total_rebasa_en_pedido(self, comprador, producto, cupon, vendedor):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido

        services.actualizar_cupon(cupon=cupon, usuario=vendedor, datos={"usos_totales": 1})
        from tests.factories import PedidoFactory, UsoCuponFactory

        UsoCuponFactory(
            id_cupon=cupon,
            id_usuario=UsuarioFactory(),
            id_pedido=PedidoFactory(id_comprador=UsuarioFactory()),
            descuento_aplicado=Decimal("0.00"),
        )
        with pytest.raises(ValidationError):
            orders_services.crear_pedido(
                usuario=comprador,
                datos={
                    "id_puesto": producto.id_puesto,
                    "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                    "codigo_cupon": cupon.codigo,
                    "items": [{"id_producto": producto, "cantidad": 1}],
                },
            )

    def test_pago_refleja_descuento(self, comprador, producto, cupon):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido
        from apps.payments import services as pagos_services
        from apps.payments.models import Pago

        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": producto.id_puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "codigo_cupon": cupon.codigo,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
        )
        assert pago.subtotal_pedido == Decimal("5000.00")
        assert pago.descuento_aplicado == Decimal("2000.00")
        assert pago.total_cobrado == Decimal("3000.00")

    def test_neto_vendedor_resta_descuento(self, comprador, producto, cupon):
        from apps.common import pricing as pricing_mod
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido
        from apps.payments import services as pagos_services
        from apps.payments.models import Pago

        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": producto.id_puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "codigo_cupon": cupon.codigo,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
        )
        comision = pricing_mod.comision_plataforma(Decimal("5000.00"))
        assert pago.neto_vendedor == Decimal("5000.00") - comision - Decimal("2000.00")


@pytest.mark.django_db
class TestEndpoints:
    def test_anonimo_no_lista(self, cliente_anon):
        assert cliente_anon.get(CUPONES).status_code == status.HTTP_401_UNAUTHORIZED

    def test_vendedor_ve_sus_cupones(self, cliente_vendedor, cupon, otro_puesto):
        CuponFactory(id_puesto=otro_puesto)
        respuesta = cliente_vendedor.get(CUPONES)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["count"] == 1

    def test_comprador_no_ve(self, cliente_comprador, cupon):
        respuesta = cliente_comprador.get(CUPONES)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["count"] == 0

    def test_vendedor_crea_por_api(self, cliente_vendedor, puesto):
        respuesta = cliente_vendedor.post(
            CUPONES, _datos(puesto.pk, codigo="NUEVO1"), format="json"
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["codigo"] == "NUEVO1"
        assert respuesta.data["id_puesto"] == puesto.pk

    def test_vendedor_no_crea_global(self, cliente_vendedor):
        respuesta = cliente_vendedor.post(CUPONES, _datos(None, codigo="GLOB1"), format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_crea_global(self, cliente_admin):
        respuesta = cliente_admin.post(CUPONES, _datos(None, codigo="GLOB2"), format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED

    def test_otro_vendedor_no_edita(self, cliente_otro_vendedor, cupon):
        respuesta = cliente_otro_vendedor.patch(
            f"{CUPONES}{cupon.pk}/", {"activo": False}, format="json"
        )
        assert respuesta.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_validar_ok(self, cliente_comprador, cupon):
        respuesta = cliente_comprador.post(
            f"{CUPONES}validar/",
            {"codigo": cupon.codigo, "id_puesto": cupon.id_puesto_id, "subtotal": "5000.00"},
            format="json",
        )
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["descuento"] == "2000.00"

    def test_validar_inexistente_400(self, cliente_comprador, puesto):
        respuesta = cliente_comprador.post(
            f"{CUPONES}validar/",
            {"codigo": "NOEXISTE", "id_puesto": puesto.pk, "subtotal": "5000.00"},
            format="json",
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_crear_pedido_con_cupon_por_api(self, cliente_comprador, producto, cupon):
        respuesta = cliente_comprador.post(
            "/api/orders/pedidos/",
            {
                "id_puesto": producto.id_puesto_id,
                "tipo_entrega": "retiro",
                "codigo_cupon": cupon.codigo,
                "items": [{"id_producto": producto.pk, "cantidad": 1}],
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["descuento_cupon"] == "2000.00"
        assert respuesta.data["total"] == "3000.00"
        assert respuesta.data["id_cupon"] == cupon.pk
