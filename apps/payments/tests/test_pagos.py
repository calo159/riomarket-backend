"""Tests del módulo de pagos (Fase 4)."""

import hashlib
import hmac
import json
from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.orders import services as orders_services
from apps.orders.models import Pedido
from apps.payments import services as pagos_services
from apps.payments.models import Pago
from tests.factories import PagoFactory


def _retiro(puesto, producto, cantidad=2, **extra):
    datos = {
        "id_puesto": puesto,
        "tipo_entrega": Pedido.TipoEntrega.RETIRO,
        "items": [{"id_producto": producto, "cantidad": cantidad}],
    }
    datos.update(extra)
    return datos


# ---------------------------------------------------------------------------
# Creación
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestCrearPago:
    def test_montos_retiro(self, comprador, pedido):
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
        )
        assert pago.subtotal_pedido == Decimal("20000.00")
        assert pago.tarifa_domicilio_aplicada == Decimal("0.00")
        assert pago.comision_plataforma == Decimal("0.00")
        assert pago.total_cobrado == Decimal("20000.00")
        assert pago.estado == Pago.Estado.PENDIENTE

    def test_montos_domicilio_con_comision(self, settings, comprador, puesto, producto):
        settings.PLATFORM_COMMISSION_PERCENTAGE = Decimal("10.00")
        settings.DOMICILIO_TARIFA_BASE = Decimal("3000.00")
        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos=_retiro(
                puesto,
                producto,
                tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                direccion_entrega="Calle 1 #2-3",
            ),
        )
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.NEQUI}
        )
        assert pago.tarifa_domicilio_aplicada == Decimal("3000.00")
        assert pago.comision_plataforma == Decimal("2000.00")
        assert pago.total_cobrado == Decimal("23000.00")
        assert pago.neto_vendedor == Decimal("18000.00")

    def test_metodo_por_defecto_simulado_en_sandbox(self, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        assert pago.metodo_pago == Pago.MetodoPago.SIMULADO

    def test_otro_usuario_no_crea(self, otro_comprador, pedido):
        with pytest.raises(PermissionDenied):
            pagos_services.crear_pago(pedido=pedido, usuario=otro_comprador, datos={})

    def test_no_puede_pagar_pedido_cancelado(self, comprador, pedido):
        orders_services.cancelar_pedido(pedido=pedido, usuario=comprador)
        with pytest.raises(DjangoValidationError) as error:
            pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        assert "id_pedido" in error.value.message_dict

    def test_no_puede_pagar_dos_veces(self, comprador, pedido):
        pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        with pytest.raises(DjangoValidationError) as error:
            pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        assert "pedido" in error.value.message_dict

    def test_metodo_invalido(self, comprador, pedido):
        with pytest.raises(DjangoValidationError):
            pagos_services.crear_pago(
                pedido=pedido, usuario=comprador, datos={"metodo_pago": "bitcoin"}
            )


# ---------------------------------------------------------------------------
# Simulación (sandbox)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestSimular:
    def _pago(self, comprador, pedido):
        return pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})

    def test_aprobar(self, comprador, pedido):
        pago = self._pago(comprador, pedido)
        pago = pagos_services.simular_pago(
            pago=pago, usuario=comprador, datos={"accion": "aprobar"}
        )
        assert pago.estado == Pago.Estado.APROBADO
        assert pago.fecha_aprobacion is not None
        assert pago.referencia_gateway

    def test_rechazar(self, comprador, pedido):
        pago = self._pago(comprador, pedido)
        pago = pagos_services.simular_pago(
            pago=pago, usuario=comprador, datos={"accion": "rechazar"}
        )
        assert pago.estado == Pago.Estado.RECHAZADO

    def test_deshabilitado_en_prod(self, settings, comprador, pedido):
        pago = self._pago(comprador, pedido)
        settings.PAYMENTS_SANDBOX_ENABLED = False
        with pytest.raises(PermissionDenied):
            pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})

    def test_otro_usuario_no_simula(self, otro_comprador, comprador, pedido):
        pago = self._pago(comprador, pedido)
        with pytest.raises(PermissionDenied):
            pagos_services.simular_pago(pago=pago, usuario=otro_comprador, datos={})

    def test_accion_invalida(self, comprador, pedido):
        pago = self._pago(comprador, pedido)
        with pytest.raises(DjangoValidationError):
            pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "capricho"})


# ---------------------------------------------------------------------------
# Efectivo
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestConfirmarEfectivo:
    def _pago_efectivo(self, comprador, pedido):
        return pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
        )

    def test_vendedor_confirma(self, comprador, vendedor, pedido):
        pago = self._pago_efectivo(comprador, pedido)
        pago = pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor, datos={})
        assert pago.estado == Pago.Estado.APROBADO
        assert pago.referencia_gateway == "efectivo-cobrado"

    def test_comprador_no_confirma(self, comprador, pedido):
        pago = self._pago_efectivo(comprador, pedido)
        with pytest.raises(PermissionDenied):
            pagos_services.confirmar_efectivo(pago=pago, usuario=comprador, datos={})

    def test_metodo_no_efectivo(self, vendedor, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        with pytest.raises(DjangoValidationError):
            pagos_services.confirmar_efectivo(pago=pago, usuario=vendedor, datos={})


# ---------------------------------------------------------------------------
# Transiciones admin
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestTransicionesAdmin:
    def _pago_aprobado(self, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        return pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})

    def test_reembolsar_requiere_admin(self, comprador, pedido):
        pago = self._pago_aprobado(comprador, pedido)
        with pytest.raises(PermissionDenied):
            pagos_services.marcar_reembolsado(pago=pago, usuario=comprador, datos={})

    def test_admin_reembolsa(self, admin, comprador, pedido):
        pago = self._pago_aprobado(comprador, pedido)
        pago = pagos_services.marcar_reembolsado(pago=pago, usuario=admin, datos={})
        assert pago.estado == Pago.Estado.REEMBOLSADO
        assert pago.fecha_reembolso is not None

    def test_no_reembolsa_un_pendiente(self, admin, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        with pytest.raises(DjangoValidationError):
            pagos_services.marcar_reembolsado(pago=pago, usuario=admin, datos={})

    def test_admin_anula(self, admin, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        pago = pagos_services.anular_pago(pago=pago, usuario=admin, datos={})
        assert pago.estado == Pago.Estado.ANULADO

    def test_admin_reanuda_no_permitido(self, admin, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        pagos_services.anular_pago(pago=pago, usuario=admin, datos={})
        with pytest.raises(DjangoValidationError):
            pagos_services.anular_pago(pago=pago, usuario=admin, datos={})


# ---------------------------------------------------------------------------
# Cancelación de pedido
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestCancelacion:
    def test_cancelar_reembolsa_aprobado(self, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})
        orders_services.cancelar_pedido(pedido=pedido, usuario=comprador)
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.REEMBOLSADO

    def test_cancelar_anula_pendiente(self, comprador, pedido):
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        orders_services.cancelar_pedido(pedido=pedido, usuario=comprador)
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.ANULADO


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestWebhook:
    def _firmar(self, cuerpo: bytes, secreto: str) -> str:
        return hmac.new(secreto.encode(), cuerpo, hashlib.sha256).hexdigest()

    def test_webhook_aprueba(self, settings, cliente_anon, comprador, pedido):
        settings.PAYMENTS_WEBHOOK_SECRET = "secreto-pruebas"
        pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        cuerpo = json.dumps({"referencia": f"sandbox-{pago.pk}", "estado": "aprobado"}).encode()
        respuesta = cliente_anon.post(
            "/api/payments/webhook/sandbox/",
            data=cuerpo,
            content_type="application/json",
            HTTP_X_RIOMARKET_SIGNATURE=self._firmar(cuerpo, "secreto-pruebas"),
        )
        assert respuesta.status_code == 200
        pago.refresh_from_db()
        assert pago.estado == Pago.Estado.APROBADO

    def test_webhook_firma_invalida(self, settings, cliente_anon, comprador, pedido):
        settings.PAYMENTS_WEBHOOK_SECRET = "secreto-pruebas"
        pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
        respuesta = cliente_anon.post(
            "/api/payments/webhook/sandbox/",
            data=json.dumps({"referencia": "sandbox-1", "estado": "aprobado"}).encode(),
            content_type="application/json",
            HTTP_X_RIOMARKET_SIGNATURE="falsa",
        )
        assert respuesta.status_code == 403

    def test_webhook_proveedor_desconocido(self, cliente_anon):
        respuesta = cliente_anon.post(
            "/api/payments/webhook/paypal/",
            data=b"{}",
            content_type="application/json",
        )
        assert respuesta.status_code == 400


# ---------------------------------------------------------------------------
# Visibilidad, filtros y permisos de API
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestApiPagos:
    def _crear_pago(self, comprador, pedido):
        return pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})

    def test_anonimo_no_lista(self, cliente_anon):
        assert cliente_anon.get("/api/payments/pagos/").status_code == 401

    def test_comprador_solo_ve_los_suyos(self, cliente_comprador, comprador, pedido):
        pago = self._crear_pago(comprador, pedido)
        ajeno = PagoFactory()
        respuesta = cliente_comprador.get("/api/payments/pagos/")
        ids = [p["id"] for p in respuesta.data["results"]]
        assert pago.pk in ids
        assert ajeno.pk not in ids

    def test_vendedor_ve_pagos_de_su_puesto(self, cliente_vendedor, comprador, vendedor, pedido):
        pago = self._crear_pago(comprador, pedido)
        ajeno = PagoFactory()
        respuesta = cliente_vendedor.get("/api/payments/pagos/")
        ids = [p["id"] for p in respuesta.data["results"]]
        assert pago.pk in ids
        assert ajeno.pk not in ids

    def test_admin_ve_todos(self, cliente_admin, comprador, pedido):
        self._crear_pago(comprador, pedido)
        ajeno = PagoFactory()
        respuesta = cliente_admin.get("/api/payments/pagos/")
        ids = [p["id"] for p in respuesta.data["results"]]
        assert ajeno.pk in ids

    def test_comprador_no_ve_datos_internos(self, cliente_comprador, comprador, pedido):
        pago = self._crear_pago(comprador, pedido)
        respuesta = cliente_comprador.get(f"/api/payments/pagos/{pago.pk}/")
        assert "datos_sandbox" not in respuesta.data
        assert "comision_plataforma" not in respuesta.data

    def test_vendedor_ve_comision_pero_no_sandbox(self, cliente_vendedor, comprador, pedido):
        pago = self._crear_pago(comprador, pedido)
        respuesta = cliente_vendedor.get(f"/api/payments/pagos/{pago.pk}/")
        assert "comision_plataforma" in respuesta.data
        assert "neto_vendedor" in respuesta.data
        assert "datos_sandbox" not in respuesta.data

    def test_admin_ve_sandbox(self, cliente_admin, comprador, pedido):
        pago = self._crear_pago(comprador, pedido)
        respuesta = cliente_admin.get(f"/api/payments/pagos/{pago.pk}/")
        assert "datos_sandbox" in respuesta.data

    def test_crea_pago_por_api(self, cliente_comprador, comprador, pedido):
        respuesta = cliente_comprador.post(
            "/api/payments/pagos/",
            {"pedido": pedido.pk, "metodo_pago": "simulado"},
            format="json",
        )
        assert respuesta.status_code == 201
        assert respuesta.data["estado"] == "pendiente"
        assert respuesta.data["id_pedido"] == pedido.pk

    def test_simula_por_api(self, cliente_comprador, comprador, pedido):
        pago = self._crear_pago(comprador, pedido)
        respuesta = cliente_comprador.post(
            f"/api/payments/pagos/{pago.pk}/simular/", {"accion": "aprobar"}, format="json"
        )
        assert respuesta.status_code == 200
        assert respuesta.data["estado"] == "aprobado"

    def test_reembolsar_requiere_admin_api(
        self, cliente_comprador, cliente_admin, comprador, pedido
    ):
        pago = self._crear_pago(comprador, pedido)
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})
        assert (
            cliente_comprador.post(f"/api/payments/pagos/{pago.pk}/reembolsar/").status_code == 403
        )
        assert cliente_admin.post(f"/api/payments/pagos/{pago.pk}/reembolsar/").status_code == 200

    def test_confirmar_efectivo_por_api(self, cliente_vendedor, comprador, pedido):
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.EFECTIVO}
        )
        respuesta = cliente_vendedor.post(f"/api/payments/pagos/{pago.pk}/confirmar-efectivo/")
        assert respuesta.status_code == 200
        assert respuesta.data["estado"] == "aprobado"

    def test_filtro_por_estado_invalido_no_filtra(self, cliente_comprador, comprador, pedido):
        self._crear_pago(comprador, pedido)
        respuesta = cliente_comprador.get("/api/payments/pagos/", {"estado": "inventado"})
        assert respuesta.status_code == 200

    def test_ordering_invalido_400(self, cliente_comprador, comprador, pedido):
        self._crear_pago(comprador, pedido)
        respuesta = cliente_comprador.get("/api/payments/pagos/", {"ordering": "password"})
        assert respuesta.status_code == 400

    def test_no_delete_ni_put(self, cliente_comprador, comprador, pedido):
        pago = self._crear_pago(comprador, pedido)
        assert cliente_comprador.delete(f"/api/payments/pagos/{pago.pk}/").status_code == 405
        assert (
            cliente_comprador.put(f"/api/payments/pagos/{pago.pk}/", {}, format="json").status_code
            == 405
        )


@pytest.mark.django_db
def test_visibles_pagos_por_rol(comprador, vendedor, admin, pedido):
    pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
    qs = Pago.objects.all()
    from django.contrib.auth.models import AnonymousUser

    assert list(pagos_services.visibles_pagos(comprador, qs, {})) == [pago]
    assert list(pagos_services.visibles_pagos(vendedor, qs, {})) == [pago]
    assert list(pagos_services.visibles_pagos(admin, qs, {})) == [pago]
    assert list(pagos_services.visibles_pagos(AnonymousUser(), qs, {})) == []


@pytest.mark.django_db
def test_filtrar_pagos(comprador, pedido):
    pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
    qs = Pago.objects.all()
    assert list(pagos_services.filtrar_pagos(qs, {"estado": "pendiente"})) == [pago]
    assert list(pagos_services.filtrar_pagos(qs, {"metodo_pago": "simulado"})) == [pago]
    assert list(pagos_services.filtrar_pagos(qs, {"pedido": pedido.pk})) == [pago]
    with pytest.raises(DjangoValidationError):
        pagos_services.filtrar_pagos(qs, {"pedido": "mucho"})


@pytest.mark.django_db
def test_pedido_ajeno_no_visible_por_pago(cliente_comprador):
    ajeno = PagoFactory()
    assert cliente_comprador.get(f"/api/payments/pagos/{ajeno.pk}/").status_code == 404


@pytest.mark.django_db
def test_pago_audita_transiciones(comprador, pedido):
    pago = pagos_services.crear_pago(pedido=pedido, usuario=comprador, datos={})
    pago = pagos_services.simular_pago(pago=pago, usuario=comprador, datos={})
    assert pago.datos_sandbox["ultimo_evento"]["origen"] == "simulacion"
    assert pago.datos_sandbox["ultimo_evento"]["accion"] == Pago.Estado.APROBADO


@pytest.mark.django_db
def test_pago_total_no_puede_mentir(comprador, pedido, db):
    from django.db import IntegrityError

    with pytest.raises(IntegrityError):
        PagoFactory(
            id_pedido=pedido,
            subtotal_pedido=Decimal("100.00"),
            total_cobrado=Decimal("999.00"),
        )
