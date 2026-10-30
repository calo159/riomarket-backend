"""Prueba del comando de datos masivos ``seed_masivo``.

Verifica que:
- genere más de 100 registros (mínimo del profesor),
- alcance las cantidades objetivo por modelo,
- sea idempotente (ejecutarlo dos veces no duplica),
- las reseñas provengan solo de pedidos entregados,
- haya pagos en varios estados (aprobado, pendiente, reembolsado/anulado).
"""

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.accounts.models import Usuario, Vendedor
from apps.addresses.models import Direccion
from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto
from apps.notifications.models import Notificacion
from apps.orders.models import ItemPedido, Pedido
from apps.payments.models import Pago
from apps.promotions.models import Cupon
from apps.reviews.models import Resena


def _conteo_total() -> int:
    modelos = [
        Usuario,
        Vendedor,
        Categoria,
        Puesto,
        Producto,
        Direccion,
        Pedido,
        ItemPedido,
        Pago,
        Cupon,
        Resena,
        Notificacion,
        RegistroAuditoria,
    ]
    return sum(modelo.objects.count() for modelo in modelos)


@pytest.mark.django_db
class TestSeedMasivo:
    def test_supera_100_registros_e_idempotente(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")

        assert _conteo_total() > 100
        assert Usuario.objects.count() == 15
        assert Vendedor.objects.filter(estado_verificacion="aprobado").count() == 4
        assert Categoria.objects.count() == 8
        assert Puesto.objects.count() == 6
        assert Producto.objects.count() == 40
        assert Direccion.objects.count() == 10
        assert Pedido.objects.count() == 30
        assert Pago.objects.count() >= 25
        assert Resena.objects.count() == 15
        assert Cupon.objects.count() == 5

        primera_total = _conteo_total()

        call_command("seed_masivo", "--password", "ClaveSegura1!")

        assert _conteo_total() == primera_total
        assert Usuario.objects.count() == 15
        assert Producto.objects.count() == 40
        assert Pedido.objects.count() == 30

    def test_if_empty_omite_base_ya_sembrada(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        total = _conteo_total()

        call_command("seed_masivo", "--if-empty", "--password", "OtraClave2!")

        assert _conteo_total() == total
        assert Usuario.objects.get(correo="admin@riomarket.test").check_password("ClaveSegura1!")

    def test_usuarios_tienen_la_contrasena_configurada(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        admin = Usuario.objects.get(correo="admin@riomarket.test")
        assert admin.check_password("ClaveSegura1!") is True
        assert admin.es_administrador

    def test_seed_actualiza_contrasena_demo_en_base_ya_sembrada(self, api_client, monkeypatch):
        call_command("seed_masivo", "--password", "OtraClaveVieja1!")
        assert _conteo_total() > 100
        admin = Usuario.objects.get(correo="admin@riomarket.test")
        assert admin.check_password("OtraClaveVieja1!")

        monkeypatch.delenv("SEED_DEMO_PASSWORD", raising=False)
        call_command("seed_masivo")

        respuesta = api_client.post(
            "/api/auth/login/",
            {"correo": "admin@riomarket.test", "password": "RioMarket2026!"},
            format="json",
        )
        assert respuesta.status_code == 200

        for correo in (
            "admin@riomarket.test",
            "carmen@riomarket.test",
            "diego@riomarket.test",
            "luis@riomarket.test",
        ):
            usuario = Usuario.objects.get(correo=correo)
            assert usuario.check_password("RioMarket2026!") is True

    def test_pedidos_en_estados_variados(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        estados = set(Pedido.objects.values_list("estado", flat=True))
        assert estados == {
            "pendiente",
            "confirmado",
            "en_preparacion",
            "en_camino",
            "listo_para_recoger",
            "entregado",
            "cancelado",
        }
        assert Pedido.objects.filter(estado="entregado").count() >= 15

    def test_el_seed_respeta_el_flujo_por_tipo_de_entrega(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        # Nadie lleva un retiro: jamás «en camino»; y el domicilio no se «recoge».
        assert not Pedido.objects.filter(tipo_entrega="retiro", estado="en_camino").exists()
        assert not Pedido.objects.filter(
            tipo_entrega="domicilio", estado="listo_para_recoger"
        ).exists()
        assert Pedido.objects.filter(tipo_entrega="retiro", estado="listo_para_recoger").exists()
        assert Pedido.objects.filter(tipo_entrega="domicilio", estado="en_camino").exists()

    def test_retiro_en_efectivo_se_paga_al_recoger(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        pedido = Pedido.objects.get(notas__startswith="[SM-28]")
        assert pedido.estado == "listo_para_recoger"
        assert pedido.pago.metodo_pago == "efectivo"
        assert pedido.pago.estado == "pendiente"

    def test_pagos_en_varios_estados(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        estados = set(Pago.objects.values_list("estado", flat=True))
        assert "aprobado" in estados
        assert "pendiente" in estados
        assert estados & {"reembolsado", "anulado"}

    def test_resenas_solo_de_pedidos_entregados(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        for resena in Resena.objects.select_related("id_puesto"):
            if resena.id_pedido_id is not None:
                assert resena.id_pedido.estado == Pedido.Estado.ENTREGADO
            else:
                assert Pedido.objects.filter(
                    id_comprador=resena.id_usuario,
                    id_puesto=resena.id_puesto,
                    estado=Pedido.Estado.ENTREGADO,
                ).exists()

    def test_seed_imagenes_asigna_archivos_del_repo(self, tmp_path):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        with override_settings(MEDIA_ROOT=tmp_path):
            call_command("seed_imagenes_demo")

        assert ImagenProducto.objects.count() == Producto.objects.count()
        assert (
            Puesto.objects.exclude(portada="").exclude(portada__isnull=True).count()
            == Puesto.objects.count()
        )
        assert (
            Puesto.objects.exclude(logo="").exclude(logo__isnull=True).count()
            == Puesto.objects.count()
        )
