"""Privacidad del WhatsApp del puesto: el celular solo sale si el vendedor lo decidió."""

import json

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario, Vendedor
from apps.catalog.models import Puesto
from tests.factories import (
    PedidoFactory,
    ProductoFactory,
    PuestoFactory,
    ResenaFactory,
    UsuarioFactory,
    VendedorFactory,
)

PUESTOS = "/api/catalog/puestos/"


def _puesto(vendedor, **extra):
    return PuestoFactory(id_vendedor=vendedor, **extra)


def _como(usuario):
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


def _whatsapp(cliente, puesto):
    respuesta = cliente.get(f"{PUESTOS}{puesto.pk}/")
    assert respuesta.status_code == 200
    return respuesta.data["whatsapp"]


@pytest.mark.django_db
def test_el_default_del_modelo_es_privado():
    assert Puesto._meta.get_field("acepta_whatsapp").default is False
    assert PuestoFactory().acepta_whatsapp is False


@pytest.mark.django_db
class TestPublicacionDelNumero:
    def test_activo_y_verificado_publica_el_numero_con_prefijo_de_pais(
        self, cliente_anon, vendedor
    ):
        puesto = _puesto(vendedor, acepta_whatsapp=True)
        assert len(vendedor.celular) == 10
        assert _whatsapp(cliente_anon, puesto) == f"57{vendedor.celular}"

    def test_sin_activar_no_publica(self, cliente_anon, vendedor):
        assert _whatsapp(cliente_anon, _puesto(vendedor)) is None

    def test_puesto_inactivo_no_publica(self, vendedor):
        puesto = _puesto(vendedor, acepta_whatsapp=True, estado=Puesto.Estado.INACTIVO)
        assert _whatsapp(_como(vendedor), puesto) is None

    def test_puesto_suspendido_no_publica(self, vendedor):
        puesto = _puesto(vendedor, acepta_whatsapp=True, estado=Puesto.Estado.SUSPENDIDO)
        assert _whatsapp(_como(vendedor), puesto) is None

    def test_vendedor_sin_verificar_no_publica(self, vendedor_pendiente):
        puesto = _puesto(vendedor_pendiente, acepta_whatsapp=True)
        assert _whatsapp(_como(vendedor_pendiente), puesto) is None

    def test_vendedor_con_verificacion_rechazada_no_publica(self, vendedor):
        Vendedor.objects.filter(id_usuario=vendedor).update(estado_verificacion="rechazado")
        puesto = _puesto(vendedor, acepta_whatsapp=True)
        assert _whatsapp(APIClient(), puesto) is None

    def test_vendedor_sin_fila_de_verificacion_no_publica(self, cliente_anon):
        sin_fila = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        puesto = _puesto(sin_fila, acepta_whatsapp=True)
        assert _whatsapp(cliente_anon, puesto) is None

    def test_vendedor_suspendido_no_publica(self, cliente_anon, vendedor):
        puesto = _puesto(vendedor, acepta_whatsapp=True)
        vendedor.suspendir()
        assert _whatsapp(cliente_anon, puesto) is None

    def test_celular_con_formato_inesperado_no_publica(self, cliente_anon, vendedor):
        puesto = _puesto(vendedor, acepta_whatsapp=True)
        Usuario.objects.filter(pk=vendedor.pk).update(celular="12345")
        assert _whatsapp(cliente_anon, puesto) is None

    def test_el_listado_publico_incluye_el_campo(self, cliente_anon, vendedor):
        _puesto(vendedor, acepta_whatsapp=True)
        otro = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        VendedorFactory(id_usuario=otro)
        _puesto(otro)
        resultados = cliente_anon.get(PUESTOS).data["results"]
        assert sorted(item["whatsapp"] is not None for item in resultados) == [False, True]


@pytest.mark.django_db
class TestElCelularNoSeFiltra:
    def test_con_whatsapp_apagado_ningun_endpoint_devuelve_el_celular(self, vendedor):
        celular = vendedor.celular
        puesto = _puesto(vendedor)
        producto = ProductoFactory(id_puesto=puesto)
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        pedido = PedidoFactory(id_comprador=comprador, id_puesto=puesto)
        ResenaFactory(id_puesto=puesto, id_usuario=comprador)

        anonimo = APIClient()
        urls = [
            (anonimo, PUESTOS),
            (anonimo, f"{PUESTOS}{puesto.pk}/"),
            (anonimo, "/api/catalog/productos/"),
            (anonimo, f"/api/catalog/productos/{producto.pk}/"),
            (anonimo, f"/api/reviews/resenas/?puesto={puesto.pk}"),
            (_como(comprador), "/api/orders/pedidos/"),
            (_como(comprador), f"/api/orders/pedidos/{pedido.pk}/"),
        ]
        for quien, url in urls:
            respuesta = quien.get(url)
            assert respuesta.status_code == 200, url
            assert celular not in json.dumps(respuesta.json()), url

    def test_con_whatsapp_activo_el_numero_solo_sale_por_el_puesto(self, vendedor):
        celular = vendedor.celular
        puesto = _puesto(vendedor, acepta_whatsapp=True)
        producto = ProductoFactory(id_puesto=puesto)
        comprador = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        pedido = PedidoFactory(id_comprador=comprador, id_puesto=puesto)
        cliente = _como(comprador)
        for url in (
            f"/api/catalog/productos/{producto.pk}/",
            "/api/catalog/productos/",
            f"/api/orders/pedidos/{pedido.pk}/",
            "/api/orders/pedidos/",
        ):
            assert celular not in json.dumps(cliente.get(url).json()), url
        cuerpo_puestos = json.dumps(APIClient().get(PUESTOS).json())
        assert f"57{celular}" in cuerpo_puestos


@pytest.mark.django_db
class TestEdicionDelInterruptor:
    def test_el_dueno_lo_activa_y_desactiva(self, cliente_vendedor, vendedor):
        puesto = _puesto(vendedor)
        activado = cliente_vendedor.patch(
            f"{PUESTOS}{puesto.pk}/", {"acepta_whatsapp": True}, format="json"
        )
        assert activado.status_code == 200
        assert activado.data["acepta_whatsapp"] is True
        assert activado.data["whatsapp"] == f"57{vendedor.celular}"
        puesto.refresh_from_db()
        assert puesto.acepta_whatsapp is True

        apagado = cliente_vendedor.patch(
            f"{PUESTOS}{puesto.pk}/", {"acepta_whatsapp": False}, format="json"
        )
        assert apagado.status_code == 200
        assert apagado.data["whatsapp"] is None

    def test_otro_vendedor_no_puede_cambiarlo(self, cliente_otro_vendedor, vendedor):
        puesto = _puesto(vendedor)
        respuesta = cliente_otro_vendedor.patch(
            f"{PUESTOS}{puesto.pk}/", {"acepta_whatsapp": True}, format="json"
        )
        assert respuesta.status_code == 403
        puesto.refresh_from_db()
        assert puesto.acepta_whatsapp is False

    def test_anonimo_y_comprador_no_pueden_cambiarlo(
        self, cliente_anon, cliente_comprador, vendedor
    ):
        puesto = _puesto(vendedor)
        for cliente in (cliente_anon, cliente_comprador):
            respuesta = cliente.patch(
                f"{PUESTOS}{puesto.pk}/", {"acepta_whatsapp": True}, format="json"
            )
            assert respuesta.status_code in (401, 403)
        puesto.refresh_from_db()
        assert puesto.acepta_whatsapp is False

    def test_el_campo_whatsapp_es_de_solo_lectura(self, cliente_vendedor, vendedor):
        puesto = _puesto(vendedor)
        cliente_vendedor.patch(
            f"{PUESTOS}{puesto.pk}/", {"whatsapp": "573000000000"}, format="json"
        )
        assert _whatsapp(cliente_vendedor, puesto) is None

    def test_un_puesto_nuevo_nace_con_el_contacto_apagado(self, cliente_vendedor):
        respuesta = cliente_vendedor.post(
            PUESTOS, {"nombre": "Nuevo", "direccion": "Calle 1 #2-3"}, format="json"
        )
        assert respuesta.status_code == 201
        assert respuesta.data["acepta_whatsapp"] is False
        assert respuesta.data["whatsapp"] is None
