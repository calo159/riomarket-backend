"""La liberación perezosa: el barrido se dispara al leer el catálogo o los pedidos."""

from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status

from apps.orders import services, vencimientos
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago

from .conftest import PEDIDOS
from .test_services import datos_pedido

pytestmark = pytest.mark.django_db

PRODUCTOS = "/api/catalog/productos/"
PUESTOS = "/api/catalog/puestos/"
PAGOS = "/api/payments/pagos/"


@pytest.fixture(autouse=True)
def _liberacion_activa(settings):
    settings.PEDIDOS_LIBERAR_EN_LECTURA = True
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def listo_vencido(comprador, vendedor, puesto, producto):
    pedido = services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 4)]))
    pagos_services.crear_pago(
        pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
    )
    services.confirmar_pedido(pedido=pedido, usuario=vendedor)
    services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
    services.marcar_listo_para_recoger(pedido=pedido, usuario=vendedor)
    Pedido.objects.filter(pk=pedido.pk).update(vence_en=timezone.now() - timedelta(minutes=1))
    return pedido


def test_get_productos_libera_el_stock_vencido(cliente_anon, listo_vencido, producto):
    producto.refresh_from_db()
    assert producto.stock == 6

    respuesta = cliente_anon.get(PRODUCTOS)

    assert respuesta.status_code == status.HTTP_200_OK
    listo_vencido.refresh_from_db()
    assert listo_vencido.estado == Pedido.Estado.CANCELADO
    assert listo_vencido.motivo_cancelacion == "no_recogido"
    producto.refresh_from_db()
    assert producto.stock == 10
    # La propia respuesta ya muestra el stock liberado (el barrido corre antes de la vista).
    resultados = respuesta.data.get("results", respuesta.data)
    assert [p["stock"] for p in resultados if p["id"] == producto.pk] == [10]


@pytest.mark.parametrize("ruta", [PUESTOS, PEDIDOS, PAGOS])
def test_las_otras_lecturas_tambien_disparan_el_barrido(
    ruta, cliente_comprador, listo_vencido, producto
):
    cliente_comprador.get(ruta)
    listo_vencido.refresh_from_db()
    assert listo_vencido.estado == Pedido.Estado.CANCELADO


def test_head_tambien_dispara_el_barrido(cliente_anon, listo_vencido):
    cliente_anon.head(PRODUCTOS)
    listo_vencido.refresh_from_db()
    assert listo_vencido.estado == Pedido.Estado.CANCELADO


def test_el_detalle_de_un_pedido_tambien_dispara_el_barrido(
    cliente_comprador, listo_vencido, producto
):
    respuesta = cliente_comprador.get(f"{PEDIDOS}{listo_vencido.pk}/")
    assert respuesta.status_code == status.HTTP_200_OK
    # La respuesta ya trae el pedido cancelado por el sistema.
    assert respuesta.data["estado"] == "cancelado"
    assert respuesta.data["motivo_cancelacion"] == "no_recogido"


def test_post_no_dispara_el_barrido(cliente_comprador, listo_vencido, monkeypatch):
    llamadas = []
    monkeypatch.setattr(vencimientos, "barrer_si_toca", lambda: llamadas.append(1))
    cliente_comprador.post(PEDIDOS, {}, format="json")
    cliente_comprador.patch(f"{PEDIDOS}{listo_vencido.pk}/", {}, format="json")
    assert llamadas == []
    listo_vencido.refresh_from_db()
    assert listo_vencido.estado == Pedido.Estado.LISTO_PARA_RECOGER


@pytest.mark.parametrize(
    "ruta",
    ["/api/health/", "/api/catalog/categorias/", "/api/notifications/notificaciones/", "/"],
)
def test_rutas_no_listadas_no_disparan_el_barrido(ruta, cliente_comprador, monkeypatch):
    llamadas = []
    monkeypatch.setattr(vencimientos, "barrer_si_toca", lambda: llamadas.append(1))
    cliente_comprador.get(ruta)
    assert llamadas == []


def test_un_fallo_del_barrido_no_rompe_la_lectura(cliente_anon, monkeypatch):
    def romper():
        raise RuntimeError("el barrido explotó")

    monkeypatch.setattr(vencimientos, "barrer_si_toca", romper)
    assert cliente_anon.get(PRODUCTOS).status_code == status.HTTP_200_OK


def test_un_fallo_interno_del_barrido_no_rompe_la_lectura(cliente_anon, monkeypatch):
    def romper(**kwargs):
        raise RuntimeError("base caída")

    monkeypatch.setattr(vencimientos, "barrer", romper)
    assert cliente_anon.get(PRODUCTOS).status_code == status.HTTP_200_OK


def test_dos_lecturas_seguidas_barren_una_sola_vez(cliente_anon, monkeypatch):
    llamadas = []
    real = vencimientos.barrer

    def contar(**kwargs):
        llamadas.append(1)
        return real(**kwargs)

    monkeypatch.setattr(vencimientos, "barrer", contar)
    cliente_anon.get(PRODUCTOS)
    cliente_anon.get(PRODUCTOS)
    cliente_anon.get(PUESTOS)
    assert llamadas == [1]


def test_con_la_liberacion_apagada_la_lectura_no_barre(cliente_anon, listo_vencido, settings):
    settings.PEDIDOS_LIBERAR_EN_LECTURA = False
    cliente_anon.get(PRODUCTOS)
    listo_vencido.refresh_from_db()
    assert listo_vencido.estado == Pedido.Estado.LISTO_PARA_RECOGER
