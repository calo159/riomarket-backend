"""Hallazgos S-03 (simular solo pagos simulados) y L-15 (webhook idempotente)."""

import hashlib
import hmac
import json

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.payments import services as pagos_services
from apps.payments.models import Pago


@pytest.mark.django_db
class TestSimularSoloSimulados:
    @pytest.mark.parametrize("metodo", [Pago.MetodoPago.EFECTIVO, Pago.MetodoPago.NEQUI])
    def test_no_se_simula_un_pago_de_otro_metodo(self, comprador, pedido, metodo):
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": metodo}
        )
        with pytest.raises(DjangoValidationError):
            pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})
        pago.refresh_from_db()
        assert pago.estado != Pago.Estado.APROBADO

    def test_el_pago_simulado_sigue_funcionando(self, comprador, pedido):
        pago = pagos_services.crear_pago(
            pedido=pedido,
            usuario=comprador,
            datos={"metodo_pago": Pago.MetodoPago.SIMULADO},
        )
        pago = pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})
        assert pago.estado == Pago.Estado.APROBADO


@pytest.mark.django_db
class TestWebhookIdempotente:
    def test_repetir_el_mismo_evento_responde_200_sin_cambios(
        self, settings, cliente_anon, comprador, pedido
    ):
        settings.PAYMENTS_WEBHOOK_SECRET = "secreto-pruebas"
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        cuerpo = json.dumps({"referencia": f"sandbox-{pago.pk}", "estado": "aprobado"}).encode()
        firma = hmac.new(b"secreto-pruebas", cuerpo, hashlib.sha256).hexdigest()
        for _ in range(2):
            respuesta = cliente_anon.post(
                "/api/payments/webhook/sandbox/",
                data=cuerpo,
                content_type="application/json",
                HTTP_X_RIOMARKET_SIGNATURE=firma,
            )
            assert respuesta.status_code == 200
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.APROBADO


@pytest.mark.django_db
class TestWebhookValidaMontoYFecha:
    def _enviar(self, cliente, settings, pago, **extra):
        settings.PAYMENTS_WEBHOOK_SECRET = "secreto-pruebas"
        cuerpo = json.dumps(
            {"referencia": f"sandbox-{pago.pk}", "estado": "aprobado", **extra}
        ).encode()
        firma = hmac.new(b"secreto-pruebas", cuerpo, hashlib.sha256).hexdigest()
        return cliente.post(
            "/api/payments/webhook/sandbox/",
            data=cuerpo,
            content_type="application/json",
            HTTP_X_RIOMARKET_SIGNATURE=firma,
        )

    def test_monto_distinto_se_rechaza(self, settings, cliente_anon, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        respuesta = self._enviar(cliente_anon, settings, pago, monto="1.00")
        assert respuesta.status_code == 400
        pago.refresh_from_db()
        assert pago.estado != Pago.Estado.APROBADO

    def test_monto_correcto_se_acepta(self, settings, cliente_anon, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        respuesta = self._enviar(cliente_anon, settings, pago, monto=str(pago.total_cobrado))
        assert respuesta.status_code == 200

    def test_evento_antiguo_se_rechaza(self, settings, cliente_anon, comprador, pedido):
        import time

        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        respuesta = self._enviar(cliente_anon, settings, pago, timestamp=time.time() - 3600)
        assert respuesta.status_code == 400

    def test_evento_reciente_se_acepta(self, settings, cliente_anon, comprador, pedido):
        import time

        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        assert self._enviar(cliente_anon, settings, pago, timestamp=time.time()).status_code == 200


@pytest.mark.django_db
class TestNetoYReintento:
    def test_neto_del_vendedor_nunca_es_negativo(self, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        # Cupón del 100 %: el descuento supera lo que queda tras la comisión.
        pago.descuento_aplicado = pago.subtotal_pedido
        assert pago.neto_vendedor == 0

    def test_un_pago_rechazado_se_puede_reintentar(self, comprador, pedido):
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
        )
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "rechazar"})
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.RECHAZADO

        nuevo = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
        )
        assert nuevo.pk == pago.pk
        assert nuevo.estado == Pago.Estado.PENDIENTE
        assert nuevo.metodo_pago == Pago.MetodoPago.EFECTIVO

    def test_un_pago_aprobado_no_se_reemplaza(self, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})
        with pytest.raises(DjangoValidationError):
            pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
