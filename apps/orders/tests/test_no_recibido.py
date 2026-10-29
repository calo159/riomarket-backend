"""Entrega por roles y reporte de "no me ha llegado" (Fase 1)."""

import pytest
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status

from apps.audit.models import RegistroAuditoria
from apps.notifications.models import Notificacion
from apps.orders import services
from apps.orders.models import Pedido
from tests.factories import PedidoFactory

from .conftest import PEDIDOS


def _pedido_en_camino(comprador, puesto, **extra):
    return PedidoFactory(
        id_comprador=comprador,
        id_puesto=puesto,
        estado=Pedido.Estado.EN_CAMINO,
        **extra,
    )


@pytest.mark.django_db
class TestEntregaPorRoles:
    def test_vendedor_no_puede_marcar_entregado(self, comprador, vendedor, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        with pytest.raises(PermissionDenied):
            services.marcar_entregado(pedido=pedido, usuario=vendedor)
        pedido.refresh_from_db()
        assert pedido.estado == Pedido.Estado.EN_CAMINO

    def test_comprador_confirma_entrega(self, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        services.marcar_entregado(pedido=pedido, usuario=comprador)
        assert pedido.estado == Pedido.Estado.ENTREGADO

    def test_admin_puede_resolver_disputa(self, admin, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        services.marcar_entregado(pedido=pedido, usuario=admin)
        assert pedido.estado == Pedido.Estado.ENTREGADO

    def test_endpoint_vendedor_recibe_403(self, cliente_vendedor, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN

    def test_endpoint_comprador_confirma(self, cliente_comprador, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/entregar/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["estado"] == Pedido.Estado.ENTREGADO


@pytest.mark.django_db
class TestReportarNoRecibido:
    def test_reporte_valido_no_cambia_estado_y_notifica(self, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        servicios = services.reportar_no_recibido(
            pedido=pedido, usuario=comprador, motivo="  No llegó  "
        )
        servicios.refresh_from_db()
        assert servicios.estado == Pedido.Estado.EN_CAMINO
        assert servicios.no_recibido_en is not None
        assert servicios.motivo_no_recibido == "No llegó"
        assert Notificacion.objects.filter(
            id_usuario=puesto.id_vendedor,
            id_pedido=pedido,
            tipo=Notificacion.Tipo.GENERAL,
        ).exists()
        assert RegistroAuditoria.objects.filter(
            accion="no_recibido", entidad="pedido", id_entidad=pedido.pk
        ).exists()

    def test_segundo_reporte_falla(self, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        services.reportar_no_recibido(pedido=pedido, usuario=comprador)
        with pytest.raises(DjangoValidationError) as error:
            services.reportar_no_recibido(pedido=pedido, usuario=comprador)
        assert "no_recibido" in error.value.message_dict

    def test_reporte_fuera_de_en_camino_falla(self, comprador, puesto):
        pedido = PedidoFactory(
            id_comprador=comprador, id_puesto=puesto, estado=Pedido.Estado.CONFIRMADO
        )
        with pytest.raises(DjangoValidationError) as error:
            services.reportar_no_recibido(pedido=pedido, usuario=comprador)
        assert "estado" in error.value.message_dict

    def test_motivo_mayor_a_200_falla(self, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        with pytest.raises(DjangoValidationError) as error:
            services.reportar_no_recibido(pedido=pedido, usuario=comprador, motivo="x" * 201)
        assert "motivo" in error.value.message_dict

    def test_otro_comprador_no_reporta(self, comprador, otro_vendedor, puesto):
        from tests.factories import UsuarioFactory

        pedido = _pedido_en_camino(comprador, puesto)
        with pytest.raises(PermissionDenied):
            services.reportar_no_recibido(pedido=pedido, usuario=UsuarioFactory())

    def test_tras_reportar_el_comprador_puede_confirmar(self, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        services.reportar_no_recibido(pedido=pedido, usuario=comprador)
        services.marcar_entregado(pedido=pedido, usuario=comprador)
        assert pedido.estado == Pedido.Estado.ENTREGADO

    def test_endpoint_reporte_ok(self, cliente_comprador, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        respuesta = cliente_comprador.post(
            f"{PEDIDOS}{pedido.pk}/no-recibido/", {"motivo": "No ha llegado"}, format="json"
        )
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["motivo_no_recibido"] == "No ha llegado"
        assert respuesta.data["no_recibido_en"] is not None

    def test_endpoint_reporte_sin_motivo_ok(self, cliente_comprador, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/no-recibido/", {}, format="json")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["motivo_no_recibido"] == ""

    def test_endpoint_vendedor_no_reporta(self, cliente_vendedor, comprador, puesto):
        pedido = _pedido_en_camino(comprador, puesto)
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/no-recibido/", {}, format="json")
        assert respuesta.status_code == status.HTTP_403_FORBIDDEN
