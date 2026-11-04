"""El comprador cancela solo mientras el pedido está pendiente; después, el puesto (ADR-018)."""

import pytest
from django.core.exceptions import PermissionDenied
from rest_framework import status

from apps.orders import permissions, services
from apps.orders.models import Pedido
from apps.orders.permissions import MENSAJE_COMPRADOR_NO_CANCELA
from tests.factories import PedidoFactory

PEDIDOS = "/api/orders/pedidos/"
E = Pedido.Estado

pytestmark = pytest.mark.django_db


def _pedido(estado, comprador, puesto, tipo=Pedido.TipoEntrega.RETIRO):
    return PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=estado, tipo_entrega=tipo)


class TestElCompradorCancelaAntesDeQueElPuestoAcepte:
    def test_cancela_un_pedido_pendiente(self, comprador, puesto):
        pedido = _pedido(E.PENDIENTE, comprador, puesto)

        services.cancelar_pedido(pedido=pedido, usuario=comprador)

        pedido.refresh_from_db()
        assert pedido.estado == E.CANCELADO

    @pytest.mark.parametrize("estado", [E.CONFIRMADO, E.EN_PREPARACION, E.LISTO_PARA_RECOGER])
    def test_no_cancela_un_pedido_que_el_puesto_ya_acepto(self, estado, comprador, puesto):
        pedido = _pedido(estado, comprador, puesto)

        with pytest.raises(PermissionDenied) as error:
            services.cancelar_pedido(pedido=pedido, usuario=comprador)

        # El mensaje explica qué hacer, no solo que no tiene permiso.
        assert str(error.value) == MENSAJE_COMPRADOR_NO_CANCELA
        pedido.refresh_from_db()
        assert pedido.estado == estado

    @pytest.mark.parametrize("estado", [E.CONFIRMADO, E.EN_PREPARACION])
    def test_un_domicilio_ya_aceptado_tampoco(self, estado, comprador, puesto):
        pedido = _pedido(estado, comprador, puesto, Pedido.TipoEntrega.DOMICILIO)

        with pytest.raises(PermissionDenied):
            services.cancelar_pedido(pedido=pedido, usuario=comprador)

    def test_el_boton_de_cancelar_no_se_ofrece_despues_de_aceptado(self, comprador, puesto):
        pendiente = _pedido(E.PENDIENTE, comprador, puesto)
        aceptado = _pedido(E.CONFIRMADO, comprador, puesto)

        assert "cancelar" in services.acciones_disponibles(pendiente, comprador)
        assert "cancelar" not in services.acciones_disponibles(aceptado, comprador)

    def test_el_mensaje_especifico_es_solo_para_el_comprador_del_pedido(self, puesto, comprador):
        # Un tercero no debe enterarse del estado del pedido por el texto del error.
        ajeno = PedidoFactory(id_puesto=puesto, estado=E.CONFIRMADO)
        with pytest.raises(PermissionDenied) as error:
            permissions.exigir(comprador, permissions.Accion.CANCELAR, ajeno)
        assert str(error.value) != MENSAJE_COMPRADOR_NO_CANCELA

    def test_la_api_responde_403_con_el_mensaje(self, cliente_comprador, comprador, puesto):
        pedido = _pedido(E.CONFIRMADO, comprador, puesto)

        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/cancelar/")

        assert respuesta.status_code == status.HTTP_403_FORBIDDEN
        assert MENSAJE_COMPRADOR_NO_CANCELA in str(respuesta.data)


class TestElPuestoYElAdministradorSiCancelanDespues:
    @pytest.mark.parametrize("estado", [E.CONFIRMADO, E.EN_PREPARACION, E.LISTO_PARA_RECOGER])
    def test_el_puesto_cancela_un_pedido_aceptado(self, estado, comprador, vendedor, puesto):
        pedido = _pedido(estado, comprador, puesto)

        services.cancelar_pedido(pedido=pedido, usuario=vendedor)

        pedido.refresh_from_db()
        assert pedido.estado == E.CANCELADO

    def test_el_administrador_cancela_un_pedido_aceptado(self, comprador, admin, puesto):
        pedido = _pedido(E.EN_PREPARACION, comprador, puesto)

        services.cancelar_pedido(pedido=pedido, usuario=admin)

        pedido.refresh_from_db()
        assert pedido.estado == E.CANCELADO

    def test_cancelar_desde_el_puesto_repone_el_stock_igual_que_antes(
        self, comprador, vendedor, puesto, producto
    ):
        stock_inicial = producto.stock
        pedido = services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "items": [{"id_producto": producto, "cantidad": 2}],
            },
        )
        producto.refresh_from_db()
        assert producto.stock == stock_inicial - 2

        pedido.estado = E.CONFIRMADO
        pedido.save(update_fields=["estado"])
        services.cancelar_pedido(pedido=pedido, usuario=vendedor)

        producto.refresh_from_db()
        assert producto.stock == stock_inicial
