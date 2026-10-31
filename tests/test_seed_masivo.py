"""Prueba del comando de datos masivos ``seed_masivo``.

Verifica que:
- genere más de 100 registros (mínimo del profesor),
- alcance las cantidades objetivo por modelo,
- sea idempotente (ejecutarlo dos veces no duplica),
- las reseñas provengan solo de pedidos entregados,
- haya pagos en varios estados (aprobado, pendiente, reembolsado/anulado).
"""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

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
        assert Producto.objects.count() == 41
        assert Direccion.objects.count() == 10
        assert Pedido.objects.count() == 32
        assert Pago.objects.count() >= 25
        assert Resena.objects.count() == 15
        assert Cupon.objects.count() == 5

        primera_total = _conteo_total()

        call_command("seed_masivo", "--password", "ClaveSegura1!")

        assert _conteo_total() == primera_total
        assert Usuario.objects.count() == 15
        assert Producto.objects.count() == 41
        assert Pedido.objects.count() == 32

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


@pytest.mark.django_db
class TestSeedMapaYContacto:
    def test_todos_los_puestos_tienen_coordenadas_distintas_en_riohacha(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        puestos = list(Puesto.objects.all())
        assert len(puestos) == 6
        for puesto in puestos:
            assert puesto.latitud is not None and puesto.longitud is not None
            assert 11.50 <= float(puesto.latitud) <= 11.60
            assert -72.95 <= float(puesto.longitud) <= -72.88
        assert len({(p.latitud, p.longitud) for p in puestos}) == 6

    def test_los_puestos_de_la_demo_publican_whatsapp(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        assert Puesto.objects.filter(acepta_whatsapp=True).count() == 6

    def test_un_despliegue_repone_coordenadas_y_contacto_sin_duplicar(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        # Simula la base ya desplegada: puestos sin coordenadas y con el contacto apagado.
        Puesto.objects.update(
            latitud=None, longitud=None, ofrece_domicilio=False, acepta_whatsapp=False
        )

        call_command("seed_masivo", "--password", "ClaveSegura1!")

        assert Puesto.objects.count() == 6
        assert not Puesto.objects.filter(latitud__isnull=True).exists()
        assert Puesto.objects.filter(acepta_whatsapp=True).count() == 6

    def test_no_pisa_coordenadas_que_ya_tiene_el_puesto(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        Puesto.objects.filter(nombre="Tejidos Guajiro").update(
            latitud="11.500000", longitud="-72.800000"
        )
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        assert str(Puesto.objects.get(nombre="Tejidos Guajiro").latitud) == "11.500000"

    def test_corrige_el_punto_generico_que_dejo_seed_demo(self):
        call_command("seed_demo")
        # seed_demo deja el mismo punto en sus dos puestos: aquí se separan.
        assert Puesto.objects.filter(latitud="11.544000", longitud="-72.907000").count() == 2

        call_command("seed_masivo", "--password", "ClaveSegura1!")

        assert Puesto.objects.count() == 6
        assert len({(p.latitud, p.longitud) for p in Puesto.objects.all()}) == 6


@pytest.mark.django_db
class TestSeedApartarConPlazo:
    """ADR-012: el seed no debe dejar que el sistema cancele los pedidos demo abiertos."""

    def test_sm31_nace_vencido_y_el_resto_de_abiertos_tiene_plazo_largo(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        ahora = timezone.now()
        sm31 = Pedido.objects.get(notas__startswith="[SM-31]")
        assert sm31.estado == "listo_para_recoger"
        assert sm31.tipo_entrega == "retiro"
        assert sm31.pago.metodo_pago == "efectivo"
        assert sm31.pago.estado == "pendiente"
        assert sm31.vence_en < ahora

        abiertos = Pedido.objects.filter(
            notas__startswith="[SM-", estado__in=("pendiente", "listo_para_recoger")
        ).exclude(pk=sm31.pk)
        assert abiertos.count() == 6  # SM-22..25, SM-28 y el encargo SM-32
        for pedido in abiertos:
            assert pedido.vence_en is not None
            assert pedido.vence_en > ahora + timedelta(days=6)

    def test_el_comando_de_arranque_cancela_solo_sm31(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("cancelar_pedidos_vencidos")
        sm31 = Pedido.objects.get(notas__startswith="[SM-31]")
        assert sm31.estado == "cancelado"
        assert sm31.motivo_cancelacion == "no_recogido"
        assert sm31.pago.estado == "anulado"
        # Nada más se tocó: SM-28 sigue listo para recoger, con su efectivo por cobrar.
        sm28 = Pedido.objects.get(notas__startswith="[SM-28]")
        assert sm28.estado == "listo_para_recoger"
        assert sm28.pago.estado == "pendiente"
        assert (
            Pedido.objects.filter(estado="cancelado", motivo_cancelacion="no_recogido").count() == 1
        )
        # Los cancelados son los 5 de siempre (SM-17..21, a mano) más SM-31 (por plazo).
        assert Pedido.objects.filter(estado="cancelado").count() == 6

    def test_arranques_repetidos_no_reviven_ni_renuevan_a_sm31(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("cancelar_pedidos_vencidos")
        stock = dict(Producto.objects.values_list("pk", "stock"))
        # Segundo arranque (Render reinicia a menudo): seed + comando otra vez.
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("cancelar_pedidos_vencidos")
        sm31 = Pedido.objects.get(notas__startswith="[SM-31]")
        assert sm31.estado == "cancelado"
        assert sm31.vence_en is None
        assert Pedido.objects.count() == 32
        assert dict(Producto.objects.values_list("pk", "stock")) == stock  # sin reponer de más

    def test_el_seed_renueva_el_plazo_de_los_demo_abiertos_que_ya_vencieron(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        pasado = timezone.now() - timedelta(hours=3)
        Pedido.objects.filter(notas__startswith="[SM-28]").update(vence_en=pasado)
        Pedido.objects.filter(notas__startswith="[SM-22]").update(vence_en=pasado)

        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("cancelar_pedidos_vencidos")

        for clave in ("SM-28", "SM-22"):
            pedido = Pedido.objects.get(notas__startswith=f"[{clave}]")
            assert pedido.estado in ("listo_para_recoger", "pendiente")
            assert pedido.vence_en > timezone.now() + timedelta(days=6)

    def test_los_pedidos_demo_sin_plazo_siguen_sin_plazo(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        # Domicilios, entregados, cancelados, confirmados y en preparación: jamás reciben plazo.
        sin_plazo = Pedido.objects.exclude(estado__in=("pendiente", "listo_para_recoger"))
        assert not sin_plazo.filter(vence_en__isnull=False).exists()
        assert not Pedido.objects.filter(tipo_entrega="domicilio", vence_en__isnull=False).exists()


@pytest.mark.django_db
class TestSeedEncargos:
    """ADR-013: un producto por encargo y un pedido demo pendiente."""

    def test_hay_un_producto_por_encargo_sin_stock_y_con_foto(self, tmp_path):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        encargos = Producto.objects.filter(modalidad="encargo")
        assert encargos.count() == 1
        producto = encargos.get()
        assert producto.stock == 0
        assert producto.preparacion_horas == 48
        assert producto.pide_detalles is True
        assert producto.id_puesto.nombre == "Dulces de Carmen"
        with override_settings(MEDIA_ROOT=tmp_path):
            call_command("seed_imagenes_demo")
        assert producto.imagenes.count() == 1

    def test_sm32_es_un_encargo_pendiente_con_detalles_y_fecha(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        ahora = timezone.now()
        pedido = Pedido.objects.get(notas__startswith="[SM-32]")
        assert pedido.estado == "pendiente"
        assert pedido.tipo_entrega == "retiro"
        assert pedido.pago.metodo_pago == "efectivo"
        assert pedido.fecha_solicitada > ahora + timedelta(days=7)
        item = pedido.items.get()
        assert item.modalidad == "encargo"
        assert item.detalles == "Para 12 personas. Que diga: Feliz día, mamá"
        # El plazo para aceptarlo no pasa de la fecha pedida.
        assert ahora < pedido.vence_en <= pedido.fecha_solicitada

    def test_arranques_repetidos_no_duplican_ni_cancelan_el_encargo(self):
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("cancelar_pedidos_vencidos")  # cancela SM-31 (vencido a propósito)
        stock = dict(Producto.objects.values_list("pk", "stock"))
        Pedido.objects.filter(notas__startswith="[SM-32]").update(
            fecha_solicitada=timezone.now() - timedelta(days=1)
        )
        call_command("seed_masivo", "--password", "ClaveSegura1!")
        call_command("cancelar_pedidos_vencidos")
        pedido = Pedido.objects.get(notas__startswith="[SM-32]")
        assert pedido.estado == "pendiente"
        assert pedido.fecha_solicitada > timezone.now() + timedelta(days=7)
        assert Pedido.objects.filter(notas__startswith="[SM-32]").count() == 1
        assert Producto.objects.filter(modalidad="encargo").count() == 1
        assert dict(Producto.objects.values_list("pk", "stock")) == stock
