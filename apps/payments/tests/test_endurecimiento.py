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
