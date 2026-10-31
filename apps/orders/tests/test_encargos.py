"""Pedidos con productos por encargo (ADR-013).

Este paquete toca ``crear_pedido`` y ``_reponer_stock``: las pruebas se centran en lo que
NUNCA debe pasar (vender un producto con stock sin stock, reponer stock de un encargo que
nunca se descontó) y en que el producto de stock se comporta exactamente como antes.
"""

from datetime import timedelta
from zoneinfo import ZoneInfo

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status

from apps.notifications.models import Notificacion
from apps.orders import services, vencimientos
from apps.orders.models import ItemPedido, Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from apps.promotions.models import UsoCupon
from tests.factories import CuponFactory, ProductoFactory

from .conftest import PEDIDOS

pytestmark = pytest.mark.django_db

E = Pedido.Estado
EFECTIVO = Pago.MetodoPago.EFECTIVO


# ---------------------------------------------------------------------------
# Ayudas
# ---------------------------------------------------------------------------
@pytest.fixture
def torta(puesto):
    """Encargo: 24 h de preparación, pide detalles, sin stock."""
    return ProductoFactory(
        id_puesto=puesto,
        nombre="Torta de chocolate",
        precio="50000.00",
        stock=0,
        modalidad="encargo",
        preparacion_horas=24,
        pide_detalles=True,
        etiqueta_detalles="Mensaje para la torta",
    )


@pytest.fixture
def pudin(puesto):
    """Encargo que NO pide detalles."""
    return ProductoFactory(
        id_puesto=puesto,
        nombre="Pudín",
        precio="8000.00",
        stock=0,
        modalidad="encargo",
        preparacion_horas=12,
        pide_detalles=False,
    )


def _linea(producto, cantidad=1, detalles=None):
    linea = {"id_producto": producto, "cantidad": cantidad}
    if detalles is not None:
        linea["detalles"] = detalles
    return linea


def _datos(puesto, lineas, fecha="auto", **extra):
    datos = {"id_puesto": puesto, "tipo_entrega": "retiro", "items": lineas}
    if fecha == "auto":
        fecha = timezone.now() + timedelta(hours=48)
    if fecha is not None:
        datos["fecha_solicitada"] = fecha
    datos.update(extra)
    return datos


def _pedir(comprador, puesto, lineas, **extra):
    return services.crear_pedido(usuario=comprador, datos=_datos(puesto, lineas, **extra))


def _mensajes(error):
    return str(error.value.message_dict)


def _pago(pedido, comprador, metodo=EFECTIVO):
    return pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": metodo}
    )


# ---------------------------------------------------------------------------
# Un encargo no usa stock
# ---------------------------------------------------------------------------
class TestSinStock:
    def test_encargo_no_valida_ni_descuenta_stock(self, comprador, puesto, torta):
        assert torta.stock == 0
        pedido = _pedir(comprador, puesto, [_linea(torta, 3, "Feliz cumpleaños")])
        torta.refresh_from_db()
        assert torta.stock == 0
        assert pedido.items.get().cantidad == 3

    def test_el_item_guarda_modalidad_y_detalles(self, comprador, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "  Maracuyá. Feliz día, Ana  ")])
        item = pedido.items.get()
        assert item.modalidad == "encargo"
        assert item.detalles == "Maracuyá. Feliz día, Ana"

    def test_producto_de_stock_sigue_validando_stock(self, comprador, puesto, producto):
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(producto, 11)], fecha=None)
        assert "Stock insuficiente" in _mensajes(error)
        producto.refresh_from_db()
        assert producto.stock == 10

    def test_producto_de_stock_sigue_descontando_stock(self, comprador, puesto, producto):
        pedido = _pedir(comprador, puesto, [_linea(producto, 4)], fecha=None)
        producto.refresh_from_db()
        assert producto.stock == 6
        item = pedido.items.get()
        assert item.modalidad == "stock"
        assert item.detalles == ""
        assert pedido.fecha_solicitada is None

    def test_producto_de_stock_agotado_no_se_vende_aunque_haya_encargos(
        self, comprador, puesto, producto, torta
    ):
        producto.stock = 0
        producto.save()
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(producto, 1), _linea(torta, 1, "x")])
        assert "Stock insuficiente" in _mensajes(error)

    def test_los_detalles_se_ignoran_en_productos_de_stock(self, comprador, puesto, producto):
        pedido = _pedir(comprador, puesto, [_linea(producto, 1, "texto suelto")], fecha=None)
        assert pedido.items.get().detalles == ""

    def test_encargo_inactivo_no_se_puede_pedir(self, comprador, puesto, torta):
        torta.estado = "inactivo"
        torta.save()
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x")])
        assert "no está disponible" in _mensajes(error)

    def test_precio_del_encargo_se_congela(self, comprador, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 2, "x")])
        torta.precio = "99999.00"
        torta.save()
        item = pedido.items.get()
        assert item.precio_unitario == 50000
        assert pedido.subtotal == 100000
        assert pedido.total == 100000


# ---------------------------------------------------------------------------
# Pedido mixto
# ---------------------------------------------------------------------------
class TestPedidoMixto:
    def test_pedido_mixto_descuenta_solo_stock(self, comprador, puesto, producto, torta):
        pedido = _pedir(comprador, puesto, [_linea(producto, 3), _linea(torta, 2, "Feliz día")])
        producto.refresh_from_db()
        torta.refresh_from_db()
        assert producto.stock == 7
        assert torta.stock == 0
        assert pedido.subtotal == 3 * 1500 + 2 * 50000
        assert {i.id_producto_id: i.modalidad for i in pedido.items.all()} == {
            producto.pk: "stock",
            torta.pk: "encargo",
        }
        assert pedido.fecha_solicitada is not None

    def test_cancelar_mixto_repone_solo_stock(self, comprador, vendedor, puesto, producto, torta):
        pedido = _pedir(comprador, puesto, [_linea(producto, 3), _linea(torta, 2, "Feliz día")])
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        producto.refresh_from_db()
        torta.refresh_from_db()
        assert producto.stock == 10  # volvieron los 3 que se habían apartado
        assert torta.stock == 0  # el encargo nunca tuvo stock: no se inventa

    def test_cancelar_solo_encargos_no_toca_ningun_stock(self, comprador, puesto, torta, pudin):
        pedido = _pedir(comprador, puesto, [_linea(torta, 2, "x"), _linea(pudin, 5)])
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        torta.refresh_from_db()
        pudin.refresh_from_db()
        assert (torta.stock, pudin.stock) == (0, 0)

    def test_cancelar_mixto_libera_cupon_y_anula_pago(
        self, comprador, puesto, producto, torta, vendedor
    ):
        cupon = CuponFactory(id_puesto=puesto)
        pedido = _pedir(
            comprador,
            puesto,
            [_linea(producto, 1), _linea(torta, 1, "x")],
            codigo_cupon=cupon.codigo,
        )
        pago = _pago(pedido, comprador)
        services.cancelar_pedido(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.ANULADO
        assert not UsoCupon.objects.filter(id_pedido=pedido).exists()

    def test_cancelar_dos_veces_no_repone_dos_veces(self, comprador, puesto, producto, torta):
        pedido = _pedir(comprador, puesto, [_linea(producto, 3), _linea(torta, 1, "x")])
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        with pytest.raises(DjangoValidationError):
            services.cancelar_pedido(pedido=pedido, usuario=comprador)
        producto.refresh_from_db()
        assert producto.stock == 10

    def test_cancelar_por_vencimiento_repone_solo_stock(self, comprador, puesto, producto, torta):
        pedido = _pedir(comprador, puesto, [_linea(producto, 3), _linea(torta, 2, "x")])
        ahora = timezone.now()
        Pedido.objects.filter(pk=pedido.pk).update(vence_en=ahora - timedelta(minutes=1))
        resultado = vencimientos.cancelar_vencidos(ahora=ahora)
        assert resultado.cancelados == [pedido.pk]
        producto.refresh_from_db()
        torta.refresh_from_db()
        assert producto.stock == 10
        assert torta.stock == 0
        assert Pedido.objects.get(pk=pedido.pk).estado == E.CANCELADO

    def test_snapshot_de_modalidad_protege_pedidos_abiertos(
        self, comprador, puesto, producto, vendedor
    ):
        """Un producto de stock que pasa a encargo NO cambia lo ya pedido.

        El ítem guarda ``stock``: al cancelar, el stock apartado vuelve (aunque el producto
        ya sea por encargo). Y al revés, un encargo que pasa a stock no «repone» lo que nunca
        se descontó.
        """
        from apps.catalog import services as catalogo

        pedido_stock = _pedir(comprador, puesto, [_linea(producto, 4)], fecha=None)
        producto.refresh_from_db()
        assert producto.stock == 6
        catalogo.actualizar_producto(
            producto=producto,
            usuario=vendedor,
            datos={"modalidad": "encargo", "preparacion_horas": 24},
        )
        producto.refresh_from_db()
        assert producto.stock == 0
        assert pedido_stock.items.get().modalidad == "stock"
        services.cancelar_pedido(pedido=pedido_stock, usuario=comprador)
        producto.refresh_from_db()
        assert producto.stock == 4  # el snapshot manda: se apartaron 4 y vuelven 4

    def test_encargo_que_pasa_a_stock_no_repone_al_cancelar(
        self, comprador, puesto, torta, vendedor
    ):
        from apps.catalog import services as catalogo

        pedido = _pedir(comprador, puesto, [_linea(torta, 2, "x")])
        catalogo.actualizar_producto(
            producto=torta, usuario=vendedor, datos={"modalidad": "stock", "stock": 5}
        )
        torta.refresh_from_db()
        assert torta.stock == 5
        item = pedido.items.get()
        assert item.modalidad == "encargo"
        assert item.detalles == "x"
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        torta.refresh_from_db()
        assert torta.stock == 5  # no se sumaron las 2 del encargo

    def test_editar_el_producto_no_cambia_lo_ya_pedido(self, comprador, puesto, torta, vendedor):
        from apps.catalog import services as catalogo

        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "Con fresas")])
        catalogo.actualizar_producto(
            producto=torta,
            usuario=vendedor,
            datos={"preparacion_horas": 72, "etiqueta_detalles": "Otra", "nombre": "Torta XL"},
        )
        item = ItemPedido.objects.get(pk=pedido.items.get().pk)
        assert item.detalles == "Con fresas"
        assert item.modalidad == "encargo"
        assert item.nombre_producto == "Torta de chocolate"


# ---------------------------------------------------------------------------
# Fecha solicitada
# ---------------------------------------------------------------------------
class TestFechaSolicitada:
    def test_encargo_requiere_fecha(self, comprador, puesto, torta):
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=None)
        assert error.value.message_dict["fecha_solicitada"] == ["Elige para cuándo lo necesitas."]

    def test_fecha_antes_de_la_preparacion_da_400(self, comprador, puesto, torta):
        fecha = timezone.now() + timedelta(hours=10)
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=fecha)
        mensaje = error.value.message_dict["fecha_solicitada"][0]
        assert puesto.nombre in mensaje
        assert "al menos 24 horas" in mensaje
        assert "Elige desde el" in mensaje

    def test_el_mensaje_no_duplica_el_punto_de_pm(self, comprador, puesto, torta):
        fecha = timezone.now() + timedelta(hours=1)
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=fecha)
        assert ".." not in error.value.message_dict["fecha_solicitada"][0]

    def test_la_fecha_minima_usa_la_mayor_preparacion_del_pedido(
        self, comprador, puesto, torta, pudin
    ):
        torta.preparacion_horas = 72
        torta.save()
        fecha = timezone.now() + timedelta(hours=30)  # sirve para el pudín, no para la torta
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x"), _linea(pudin, 1)], fecha=fecha)
        assert "al menos 72 horas" in error.value.message_dict["fecha_solicitada"][0]

    def test_fecha_en_el_pasado_da_error(self, comprador, puesto, torta):
        with pytest.raises(DjangoValidationError):
            _pedir(
                comprador,
                puesto,
                [_linea(torta, 1, "x")],
                fecha=timezone.now() - timedelta(days=1),
            )

    def test_fecha_mas_de_60_dias_da_400(self, comprador, puesto, torta):
        fecha = timezone.now() + timedelta(days=61)
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=fecha)
        assert error.value.message_dict["fecha_solicitada"] == [
            "Solo se aceptan encargos para los próximos 60 días."
        ]

    def test_60_dias_exactos_menos_un_minuto_se_acepta(self, comprador, puesto, torta):
        fecha = timezone.now() + timedelta(days=60) - timedelta(minutes=1)
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=fecha)
        assert pedido.fecha_solicitada == fecha

    def test_justo_en_el_minimo_se_acepta(self, comprador, puesto, torta):
        fecha = timezone.now() + timedelta(hours=24, minutes=1)
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=fecha)
        assert pedido.fecha_solicitada == fecha

    def test_tolerancia_de_cinco_minutos(self, comprador, puesto, torta):
        # 4 min antes del mínimo: pasa (reloj del celular, tiempo de llenar el formulario).
        ok = timezone.now() + timedelta(hours=24) - timedelta(minutes=4)
        assert _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=ok).pk
        # 7 min antes: no.
        mal = timezone.now() + timedelta(hours=24) - timedelta(minutes=7)
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=mal)
        assert "fecha_solicitada" in error.value.message_dict

    def test_sin_encargos_la_fecha_se_ignora(self, comprador, puesto, producto):
        pedido = _pedir(
            comprador,
            puesto,
            [_linea(producto, 1)],
            fecha=timezone.now() - timedelta(days=400),
        )
        assert pedido.fecha_solicitada is None
        assert Pedido.objects.get(pk=pedido.pk).fecha_solicitada is None

    def test_fecha_no_se_edita_despues(self, cliente_comprador, comprador, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")])
        original = pedido.fecha_solicitada
        respuesta = cliente_comprador.patch(
            f"{PEDIDOS}{pedido.pk}/",
            {"fecha_solicitada": (timezone.now() + timedelta(days=5)).isoformat(), "notas": "hola"},
            format="json",
        )
        assert respuesta.status_code == status.HTTP_200_OK
        pedido.refresh_from_db()
        assert pedido.fecha_solicitada == original
        assert pedido.notas == "hola"

    def test_fecha_sin_zona_se_toma_como_hora_de_colombia(self, cliente_comprador, puesto, torta):
        bogota = ZoneInfo("America/Bogota")
        futuro = (timezone.now().astimezone(bogota) + timedelta(days=3)).replace(
            hour=16, minute=0, second=0, microsecond=0
        )
        respuesta = cliente_comprador.post(
            PEDIDOS,
            {
                "id_puesto": puesto.pk,
                "tipo_entrega": "retiro",
                "fecha_solicitada": futuro.replace(tzinfo=None).isoformat(),
                "items": [{"id_producto": torta.pk, "cantidad": 1, "detalles": "x"}],
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_201_CREATED, respuesta.data
        guardada = Pedido.objects.get(pk=respuesta.data["id"]).fecha_solicitada
        assert guardada == futuro  # mismo instante que las 4 p. m. de Bogotá


# ---------------------------------------------------------------------------
# Cantidad y detalles
# ---------------------------------------------------------------------------
class TestCantidadYDetalles:
    def test_maximo_20_unidades_por_encargo(self, comprador, puesto, torta):
        assert _pedir(comprador, puesto, [_linea(torta, 20, "x")]).pk
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 21, "x")])
        assert "hasta 20 unidades de 'Torta de chocolate'" in _mensajes(error)

    def test_el_maximo_cuenta_las_lineas_repetidas(self, comprador, puesto, torta):
        with pytest.raises(DjangoValidationError):
            _pedir(comprador, puesto, [_linea(torta, 12, "x"), _linea(torta, 12, "x")])

    def test_el_tope_de_20_no_aplica_a_productos_de_stock(self, comprador, puesto):
        grande = ProductoFactory(id_puesto=puesto, stock=100)
        pedido = _pedir(comprador, puesto, [_linea(grande, 50)], fecha=None)
        assert pedido.items.get().cantidad == 50

    def test_detalles_obligatorios_si_el_producto_los_pide(self, comprador, puesto, torta):
        for vacio in (None, "", "   "):
            with pytest.raises(DjangoValidationError) as error:
                _pedir(comprador, puesto, [_linea(torta, 1, vacio)])
            mensaje = error.value.message_dict["items"][0]
            assert mensaje == "Escribe mensaje para la torta para 'Torta de chocolate'."

    def test_detalles_opcionales_si_el_producto_no_los_pide(self, comprador, puesto, pudin):
        pedido = _pedir(comprador, puesto, [_linea(pudin, 2)])
        assert pedido.items.get().detalles == ""

    def test_detalles_limitados_en_longitud(self, comprador, puesto, torta):
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "a" * 301)])
        assert "300" in _mensajes(error)

    def test_detalles_de_300_caracteres_se_aceptan(self, comprador, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "a" * 300)])
        assert len(pedido.items.get().detalles) == 300

    def test_detalles_distintos_del_mismo_producto_da_400(self, comprador, puesto, torta):
        with pytest.raises(DjangoValidationError) as error:
            _pedir(comprador, puesto, [_linea(torta, 1, "Fresa"), _linea(torta, 1, "Mora")])
        assert error.value.message_dict["items"] == [
            "Escribe los detalles una sola vez por producto."
        ]

    def test_detalles_iguales_se_suman(self, comprador, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "Fresa"), _linea(torta, 2, "Fresa")])
        item = pedido.items.get()
        assert (item.cantidad, item.detalles) == (3, "Fresa")

    def test_detalles_en_una_sola_de_las_lineas_repetidas(self, comprador, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1), _linea(torta, 2, "Fresa")])
        item = pedido.items.get()
        assert (item.cantidad, item.detalles) == (3, "Fresa")

    def test_cupon_y_total_no_cambian_con_un_encargo(self, comprador, puesto, torta):
        cupon = CuponFactory(id_puesto=puesto)
        sin = _pedir(comprador, puesto, [_linea(torta, 2, "x")], codigo_cupon=cupon.codigo)
        assert sin.subtotal == 100000
        assert sin.total == sin.subtotal + sin.tarifa_domicilio - sin.descuento_cupon
        assert sin.id_cupon_id == cupon.pk


# ---------------------------------------------------------------------------
# Plazos de C1
# ---------------------------------------------------------------------------
class TestPlazos:
    def test_vence_en_de_encargo_pendiente_es_el_minimo(self, comprador, puesto, pudin):
        # Fecha lejana: manda el plazo de confirmación (24 h).
        antes = timezone.now()
        lejano = _pedir(comprador, puesto, [_linea(pudin, 1)], fecha=antes + timedelta(days=5))
        assert abs(lejano.vence_en - (antes + timedelta(hours=24))) < timedelta(minutes=1)
        # Fecha cercana (12 h de preparación + 2 h): el puesto debe aceptar antes de la fecha.
        fecha = antes + timedelta(hours=14)
        cercano = _pedir(comprador, puesto, [_linea(pudin, 1)], fecha=fecha)
        assert cercano.vence_en == fecha

    def test_encargo_a_domicilio_no_tiene_plazo(
        self, comprador, puesto_domicilio, vendedor, producto_domicilio
    ):
        torta = ProductoFactory(
            id_puesto=puesto_domicilio,
            stock=0,
            modalidad="encargo",
            preparacion_horas=24,
            pide_detalles=False,
        )
        pedido = services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": puesto_domicilio,
                "tipo_entrega": "domicilio",
                "direccion_entrega": "Calle 15 #7-42",
                "fecha_solicitada": timezone.now() + timedelta(days=3),
                "items": [_linea(torta, 1)],
            },
        )
        assert pedido.vence_en is None

    def test_vence_en_de_encargo_listo_parte_de_la_fecha_pedida(
        self, comprador, vendedor, puesto, torta
    ):
        puesto.plazo_retiro_horas = 48
        puesto.save()
        fecha = timezone.now() + timedelta(days=3)
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")], fecha=fecha)
        _pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        pedido.refresh_from_db()
        assert abs(pedido.vence_en - (fecha + timedelta(hours=48))) < timedelta(seconds=5)

    def test_encargo_listo_con_fecha_pasada_parte_de_ahora(
        self, comprador, vendedor, puesto, pudin
    ):
        fecha = timezone.now() + timedelta(hours=13)
        pedido = _pedir(comprador, puesto, [_linea(pudin, 1)], fecha=fecha)
        _pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        # La fecha ya pasó cuando el puesto lo deja listo.
        Pedido.objects.filter(pk=pedido.pk).update(
            fecha_solicitada=timezone.now() - timedelta(days=1)
        )
        pedido.refresh_from_db()
        antes = timezone.now()
        services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
        pedido.refresh_from_db()
        assert abs(pedido.vence_en - (antes + timedelta(hours=24))) < timedelta(minutes=1)

    def test_pedido_sin_encargo_conserva_el_plazo_de_siempre(
        self, comprador, vendedor, puesto, producto
    ):
        antes = timezone.now()
        pedido = _pedir(comprador, puesto, [_linea(producto, 1)], fecha=None)
        assert abs(pedido.vence_en - (antes + timedelta(hours=24))) < timedelta(minutes=1)


# ---------------------------------------------------------------------------
# Notificaciones
# ---------------------------------------------------------------------------
class TestNotificaciones:
    def test_aviso_al_vendedor_de_un_encargo_nuevo(self, comprador, vendedor, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")])
        aviso = Notificacion.objects.get(id_usuario=vendedor, id_pedido=pedido)
        assert aviso.mensaje.startswith(f"Recibiste el encargo #{pedido.pk} para el ")
        assert "Revísalo y confírmalo si puedes hacerlo." in aviso.mensaje

    def test_pedido_normal_conserva_su_aviso(self, comprador, vendedor, puesto, producto):
        pedido = _pedir(comprador, puesto, [_linea(producto, 1)], fecha=None)
        aviso = Notificacion.objects.get(id_usuario=vendedor, id_pedido=pedido)
        assert aviso.mensaje == f"Recibiste el pedido #{pedido.pk}."

    def test_notificacion_de_encargo_aceptado(self, comprador, vendedor, puesto, torta):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")])
        _pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        aviso = Notificacion.objects.get(
            id_usuario=comprador, id_pedido=pedido, tipo=Notificacion.Tipo.PEDIDO_CONFIRMADO
        )
        assert aviso.mensaje.startswith(f"{puesto.nombre} aceptó tu encargo #{pedido.pk} para el ")

    def test_confirmar_pedido_normal_conserva_su_aviso(self, comprador, vendedor, puesto, producto):
        pedido = _pedir(comprador, puesto, [_linea(producto, 1)], fecha=None)
        _pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        aviso = Notificacion.objects.get(
            id_usuario=comprador, id_pedido=pedido, tipo=Notificacion.Tipo.PEDIDO_CONFIRMADO
        )
        assert aviso.mensaje == f"Tu pedido #{pedido.pk} fue confirmado por el vendedor."


# ---------------------------------------------------------------------------
# Regla de pago (sin cambios): retiro con efectivo se acepta antes del pago
# ---------------------------------------------------------------------------
class TestPago:
    def test_retiro_con_efectivo_se_acepta_sin_pago_aprobado(
        self, comprador, vendedor, puesto, torta
    ):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "x")])
        pago = _pago(pedido, comprador, EFECTIVO)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pago.estado != Pago.Estado.APROBADO
        assert Pedido.objects.get(pk=pedido.pk).estado == E.CONFIRMADO

    def test_domicilio_exige_pago_aprobado_y_cancelar_reembolsa(
        self, comprador, vendedor, puesto_domicilio
    ):
        torta = ProductoFactory(
            id_puesto=puesto_domicilio,
            stock=0,
            modalidad="encargo",
            preparacion_horas=24,
            pide_detalles=False,
        )
        pedido = services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": puesto_domicilio,
                "tipo_entrega": "domicilio",
                "direccion_entrega": "Calle 15 #7-42",
                "fecha_solicitada": timezone.now() + timedelta(days=3),
                "items": [_linea(torta, 1)],
            },
        )
        pago = _pago(pedido, comprador, Pago.MetodoPago.SIMULADO)
        with pytest.raises(DjangoValidationError):
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "aprobar"})
        services.cancelar_pedido(pedido=pedido, usuario=vendedor)
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.REEMBOLSADO


# ---------------------------------------------------------------------------
# API: serializers y visibilidad
# ---------------------------------------------------------------------------
class TestApi:
    def _crear_api(self, cliente, puesto, torta, **extra):
        cuerpo = {
            "id_puesto": puesto.pk,
            "tipo_entrega": "retiro",
            "fecha_solicitada": (timezone.now() + timedelta(days=2)).isoformat(),
            "items": [{"id_producto": torta.pk, "cantidad": 1, "detalles": "Feliz día, mamá"}],
        }
        cuerpo.update(extra)
        return cliente.post(PEDIDOS, cuerpo, format="json")

    def test_crear_por_api_devuelve_detalles_fecha_y_modalidad(
        self, cliente_comprador, puesto, torta
    ):
        respuesta = self._crear_api(cliente_comprador, puesto, torta)
        assert respuesta.status_code == status.HTTP_201_CREATED, respuesta.data
        assert respuesta.data["tiene_encargo"] is True
        assert respuesta.data["fecha_solicitada"] is not None
        item = respuesta.data["items"][0]
        assert item["detalles"] == "Feliz día, mamá"
        assert item["modalidad"] == "encargo"

    def test_pedido_normal_no_tiene_encargo(self, cliente_comprador, puesto, producto):
        respuesta = cliente_comprador.post(
            PEDIDOS,
            {
                "id_puesto": puesto.pk,
                "tipo_entrega": "retiro",
                "items": [{"id_producto": producto.pk, "cantidad": 1}],
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["tiene_encargo"] is False
        assert respuesta.data["fecha_solicitada"] is None
        assert respuesta.data["items"][0]["modalidad"] == "stock"
        assert respuesta.data["items"][0]["detalles"] == ""

    def test_el_cliente_no_puede_fijar_la_modalidad_del_item(
        self, cliente_comprador, puesto, producto
    ):
        respuesta = cliente_comprador.post(
            PEDIDOS,
            {
                "id_puesto": puesto.pk,
                "tipo_entrega": "retiro",
                "items": [{"id_producto": producto.pk, "cantidad": 1, "modalidad": "encargo"}],
            },
            format="json",
        )
        assert respuesta.status_code == status.HTTP_201_CREATED
        producto.refresh_from_db()
        assert producto.stock == 9  # se trató como producto de stock
        assert respuesta.data["items"][0]["modalidad"] == "stock"

    def test_detalles_de_301_caracteres_da_400_del_serializer(
        self, cliente_comprador, puesto, torta
    ):
        respuesta = self._crear_api(
            cliente_comprador,
            puesto,
            torta,
            items=[{"id_producto": torta.pk, "cantidad": 1, "detalles": "a" * 301}],
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_fecha_anterior_da_400_con_mensaje_claro(self, cliente_comprador, puesto, torta):
        respuesta = self._crear_api(
            cliente_comprador,
            puesto,
            torta,
            fecha_solicitada=(timezone.now() + timedelta(hours=2)).isoformat(),
        )
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "al menos 24 horas" in str(respuesta.data["errors"]["fecha_solicitada"])

    def test_comprador_ajeno_no_ve_los_detalles(
        self, cliente_comprador, comprador, puesto, torta, cliente_otro_vendedor
    ):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "secreto")])
        from rest_framework.test import APIClient

        from tests.factories import UsuarioFactory

        ajeno = APIClient()
        ajeno.force_authenticate(UsuarioFactory(rol="comprador"))
        assert ajeno.get(f"{PEDIDOS}{pedido.pk}/").status_code == 404
        assert cliente_otro_vendedor.get(f"{PEDIDOS}{pedido.pk}/").status_code == 404
        lista = ajeno.get(PEDIDOS)
        assert "secreto" not in str(lista.data)
        # Quien sí lo ve: el comprador.
        assert cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/").data["items"][0]["detalles"] == (
            "secreto"
        )

    def test_vendedor_del_puesto_y_admin_ven_los_detalles(
        self, comprador, cliente_vendedor, cliente_admin, puesto, torta
    ):
        pedido = _pedir(comprador, puesto, [_linea(torta, 1, "Sin nueces")])
        for cliente in (cliente_vendedor, cliente_admin):
            respuesta = cliente.get(f"{PEDIDOS}{pedido.pk}/")
            assert respuesta.status_code == 200
            assert respuesta.data["items"][0]["detalles"] == "Sin nueces"

    def test_filtros_producto_y_abiertos(
        self, comprador, cliente_vendedor, puesto, torta, producto
    ):
        abierto = _pedir(comprador, puesto, [_linea(torta, 1, "a")])
        cerrado = _pedir(comprador, puesto, [_linea(torta, 1, "b")])
        services.cancelar_pedido(pedido=cerrado, usuario=comprador)
        otro = _pedir(comprador, puesto, [_linea(producto, 1)], fecha=None)

        def ids(**params):
            respuesta = cliente_vendedor.get(PEDIDOS, params)
            assert respuesta.status_code == 200, respuesta.data
            return {p["id"] for p in respuesta.data["results"]}

        assert ids(producto=torta.pk) == {abierto.pk, cerrado.pk}
        assert ids(producto=torta.pk, abiertos="true") == {abierto.pk}
        assert ids(abiertos="true") == {abierto.pk, otro.pk}
        assert ids(abiertos="false") == {cerrado.pk}

    def test_listado_de_pedidos_con_encargo_sin_consultas_extra(
        self, comprador, cliente_comprador, puesto, torta
    ):
        def consultas():
            with CaptureQueriesContext(connection) as contexto:
                respuesta = cliente_comprador.get(PEDIDOS)
            assert respuesta.status_code == 200
            return len(contexto)

        normales = [ProductoFactory(id_puesto=puesto, stock=50) for _ in range(5)]
        for producto in normales[:2]:
            _pedir(comprador, puesto, [_linea(producto, 1)], fecha=None)
        consultas()  # calienta cachés (RBAC, etc.)
        base = consultas()
        for producto in normales[2:]:
            _pedir(comprador, puesto, [_linea(producto, 1)], fecha=None)
        for _ in range(3):
            _pedir(comprador, puesto, [_linea(torta, 1, "x")])
        assert consultas() == base
