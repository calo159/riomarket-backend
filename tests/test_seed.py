"""Prueba del comando de datos de demostración ``seed_demo``."""

import pytest
from django.core.management import call_command

from apps.accounts.models import Usuario
from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto
from apps.orders.models import Pedido
from apps.payments.models import Pago


@pytest.mark.django_db
class TestSeedDemo:
    def test_seed_crea_datos_y_es_idempotente(self):
        call_command("seed_demo", "--password", "ClaveSegura1!")

        assert Usuario.objects.count() == 4  # admin + 2 vendedores + comprador
        assert Categoria.objects.count() == 4
        assert Puesto.objects.count() == 2
        assert Producto.objects.count() == 5
        assert Usuario.objects.filter(rol=Usuario.Rol.VENDEDOR).count() == 2
        assert Pedido.objects.count() == 1
        assert Pago.objects.count() == 1
        assert Pago.objects.get().estado == Pago.Estado.APROBADO

        call_command("seed_demo", "--password", "ClaveSegura1!")

        assert Usuario.objects.count() == 4
        assert Categoria.objects.count() == 4
        assert Puesto.objects.count() == 2
        assert Producto.objects.count() == 5
        assert ImagenProducto.objects.count() == 0
        assert Pedido.objects.count() == 1
        assert Pago.objects.count() == 1

    def test_seed_if_empty_no_toca_una_base_con_usuarios(self):
        call_command("seed_demo", "--password", "ClaveSegura1!")

        call_command("seed_demo", "--if-empty", "--password", "OtraClave2!")

        admin = Usuario.objects.get(correo="admin@riomarket.test")
        assert admin.check_password("ClaveSegura1!")
        assert Usuario.objects.count() == 4

    def test_seed_vendedores_pueden_publicar(self):
        call_command("seed_demo", "--password", "ClaveSegura1!")
        for vendedor in Usuario.objects.filter(rol=Usuario.Rol.VENDEDOR):
            assert vendedor.puede_publicar() is True
