"""Pruebas de notificaciones: servicios, email opcional, filtros y endpoints."""

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import override_settings
from rest_framework import status

from apps.notifications import services
from apps.notifications.models import Notificacion
from apps.orders import services as orders_services
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from tests.factories import NotificacionFactory, PedidoFactory, UsuarioFactory

from .conftest import NOTIFICACIONES


@pytest.mark.django_db
class TestCrearNotificacion:
    def test_crear_ok(self, comprador):
        notificacion = services.crear_notificacion(
            usuario=comprador,
            tipo=Notificacion.Tipo.GENERAL,
            titulo="Hola",
            mensaje="Mensaje",
        )
        assert notificacion.pk is not None
        assert notificacion.leida is False

    def test_tipo_invalido_falla(self, comprador):
        with pytest.raises(ValidationError):
            services.crear_notificacion(
                usuario=comprador, tipo="no_existe", titulo="x", mensaje="y"
            )


@pytest.mark.django_db
class TestAvisosDePedido:
    def test_pedido_creado_avisa_al_vendedor(self, pedido, vendedor):
        notificacion = Notificacion.objects.get(tipo=Notificacion.Tipo.PEDIDO_CREADO)
        assert notificacion.id_usuario_id == vendedor.pk
        assert notificacion.id_pedido_id == pedido.pk

    def test_cambio_estado_avisa_al_comprador(self, pedido, comprador):
        pedido.estado = "confirmado"
        pedido.save(update_fields=["estado"])
        creadas = services.notificar_cambio_estado_pedido(
            pedido=pedido, estado_anterior="pendiente"
        )
        assert len(creadas) == 1
        assert creadas[0].id_usuario_id == comprador.pk
        assert creadas[0].tipo == Notificacion.Tipo.PEDIDO_CONFIRMADO

    def test_cancelado_avisa_a_ambas_partes(self, pedido, comprador, vendedor):
        pedido.estado = "cancelado"
        pedido.save(update_fields=["estado"])
        creadas = services.notificar_cambio_estado_pedido(
            pedido=pedido, estado_anterior="pendiente"
        )
        destinatarios = {n.id_usuario_id for n in creadas}
        assert destinatarios == {comprador.pk, vendedor.pk}

    def test_estado_sin_plantilla_no_notifica(self, pedido):
        pedido.estado = "pendiente"
        pedido.save(update_fields=["estado"])
        creadas = services.notificar_cambio_estado_pedido(
            pedido=pedido, estado_anterior="pendiente"
        )
        assert creadas == []

    def test_email_deshabilitado_por_defecto(self, pedido, mailoutbox):
        pedido.estado = "confirmado"
        pedido.save(update_fields=["estado"])
        services.notificar_cambio_estado_pedido(pedido=pedido, estado_anterior="pendiente")
        assert len(mailoutbox) == 0

    @override_settings(NOTIFICATIONS_EMAIL_ENABLED=True)
    def test_email_habilitado_envia(self, pedido, comprador, mailoutbox):
        pedido.estado = "confirmado"
        pedido.save(update_fields=["estado"])
        services.notificar_cambio_estado_pedido(pedido=pedido, estado_anterior="pendiente")
        assert len(mailoutbox) == 1
        assert comprador.correo in mailoutbox[0].to


@pytest.mark.django_db
class TestIntegracionPedidos:
    def test_confirmar_pedido_notifica_al_comprador(self, pedido, comprador, vendedor):
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
        )
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "aprobar"})
        orders_services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert Notificacion.objects.filter(
            id_usuario=comprador, tipo=Notificacion.Tipo.PEDIDO_CONFIRMADO
        ).exists()

    def test_cancelar_pedido_notifica_a_ambas_partes(self, pedido, comprador, vendedor):
        orders_services.cancelar_pedido(pedido=pedido, usuario=comprador)
        destinatarios = set(
            Notificacion.objects.filter(tipo=Notificacion.Tipo.PEDIDO_CANCELADO).values_list(
                "id_usuario_id", flat=True
            )
        )
        assert destinatarios == {comprador.pk, vendedor.pk}


@pytest.mark.django_db
class TestLectura:
    def test_marcar_leida(self, notificacion):
        services.marcar_leida(notificacion=notificacion, usuario=notificacion.id_usuario)
        notificacion.refresh_from_db()
        assert notificacion.leida is True
        assert notificacion.fecha_lectura is not None

    def test_otro_usuario_no_marca(self, notificacion):
        otro = UsuarioFactory()
        with pytest.raises(PermissionDenied):
            services.marcar_leida(notificacion=notificacion, usuario=otro)

    def test_marcar_todas_leidas(self, comprador):
        NotificacionFactory(id_usuario=comprador)
        NotificacionFactory(id_usuario=comprador)
        marcadas = services.marcar_todas_leidas(usuario=comprador)
        assert marcadas == 2

    def test_contar_no_leidas(self, comprador):
        NotificacionFactory(id_usuario=comprador)
        NotificacionFactory(id_usuario=comprador, leida=True)
        assert services.contar_no_leidas(usuario=comprador) == 1


@pytest.mark.django_db
class TestVisibilidadYFiltros:
    def test_usuario_solo_ve_las_suyas(self, comprador):
        propia = NotificacionFactory(id_usuario=comprador)
        NotificacionFactory()
        qs = services.visibles_notificaciones(comprador, Notificacion.objects.all())
        assert list(qs) == [propia]

    def test_admin_ve_todas(self, admin):
        NotificacionFactory()
        NotificacionFactory()
        qs = services.visibles_notificaciones(admin, Notificacion.objects.all())
        assert qs.count() == 2

    def test_anonimo_no_ve(self):
        NotificacionFactory()
        qs = services.visibles_notificaciones(None, Notificacion.objects.all())
        assert qs.count() == 0

    def test_filtrar_por_leida_y_tipo(self, comprador):
        NotificacionFactory(id_usuario=comprador, leida=True)
        NotificacionFactory(id_usuario=comprador, leida=False, tipo=Notificacion.Tipo.GENERAL)
        qs = services.filtrar_notificaciones(Notificacion.objects.all(), {"leida": "false"})
        assert qs.count() == 1

    def test_filtrar_por_pedido(self):
        pedido = PedidoFactory()
        NotificacionFactory(id_pedido=pedido)
        NotificacionFactory()
        qs = services.filtrar_notificaciones(Notificacion.objects.all(), {"pedido": str(pedido.pk)})
        assert qs.count() == 1


@pytest.mark.django_db
class TestEndpoints:
    def test_anonimo_no_lista(self, cliente_anon):
        assert cliente_anon.get(NOTIFICACIONES).status_code == status.HTTP_401_UNAUTHORIZED

    def test_lista_solo_las_propias(self, cliente_comprador, comprador):
        NotificacionFactory(id_usuario=comprador)
        NotificacionFactory()
        respuesta = cliente_comprador.get(NOTIFICACIONES)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["count"] == 1

    def test_admin_lista_todas(self, cliente_admin):
        NotificacionFactory()
        NotificacionFactory()
        respuesta = cliente_admin.get(NOTIFICACIONES)
        assert respuesta.data["count"] == 2

    def test_detalle_ajeno_404(self, cliente_comprador):
        ajena = NotificacionFactory()
        respuesta = cliente_comprador.get(f"{NOTIFICACIONES}{ajena.pk}/")
        assert respuesta.status_code == status.HTTP_404_NOT_FOUND

    def test_accion_leida(self, cliente_comprador, notificacion):
        respuesta = cliente_comprador.post(f"{NOTIFICACIONES}{notificacion.pk}/leida/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["leida"] is True

    def test_accion_marcar_todas(self, cliente_comprador, comprador):
        NotificacionFactory(id_usuario=comprador)
        NotificacionFactory(id_usuario=comprador)
        respuesta = cliente_comprador.post(f"{NOTIFICACIONES}marcar-todas/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["marcadas"] == 2

    def test_accion_contador(self, cliente_comprador, comprador):
        NotificacionFactory(id_usuario=comprador)
        NotificacionFactory(id_usuario=comprador, leida=True)
        respuesta = cliente_comprador.get(f"{NOTIFICACIONES}contador/")
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["no_leidas"] == 1

    def test_filtro_leida_false(self, cliente_comprador, comprador):
        NotificacionFactory(id_usuario=comprador)
        NotificacionFactory(id_usuario=comprador, leida=True)
        respuesta = cliente_comprador.get(NOTIFICACIONES, {"leida": "false"})
        assert respuesta.data["count"] == 1
