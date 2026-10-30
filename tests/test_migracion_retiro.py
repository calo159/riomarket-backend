"""Migración de datos 0008: retiros «en camino» pasan a «listo para recoger» (y vuelven)."""

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

from apps.orders.models import Pedido
from tests.factories import PedidoFactory, PuestoFactory

ANTES = ("orders", "0007_estado_listo_para_recoger")
DATOS = ("orders", "0008_retiros_en_camino_a_listo_para_recoger")


def _migrar(destino):
    ejecutor = MigrationExecutor(connection)
    ejecutor.migrate([destino])


@pytest.mark.django_db(transaction=True)
def test_la_migracion_convierte_solo_los_retiros_en_camino_y_es_reversible():
    puesto = PuestoFactory(ofrece_domicilio=True, latitud="11.544000", longitud="-72.907000")
    # Esquema actual: se siembran los dos mundos y se rebobina para ejercitar ambas direcciones.
    retiro_listo = PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.LISTO_PARA_RECOGER)
    retiro_preparando = PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.EN_PREPARACION)
    retiro_entregado = PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.ENTREGADO)
    domicilio_en_camino = PedidoFactory(
        id_puesto=puesto,
        tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
        estado=Pedido.Estado.EN_CAMINO,
    )

    try:
        # Atrás: el retiro «listo para recoger» vuelve a ser «en camino» (como era antes).
        _migrar(ANTES)
        estados = dict(Pedido.objects.values_list("pk", "estado"))
        assert estados[retiro_listo.pk] == "en_camino"
        assert estados[retiro_preparando.pk] == "en_preparacion"
        assert estados[retiro_entregado.pk] == "entregado"
        assert estados[domicilio_en_camino.pk] == "en_camino"

        # Adelante: los retiros «en camino» heredados pasan a «listo para recoger».
        _migrar(DATOS)
        estados = dict(Pedido.objects.values_list("pk", "estado"))
        assert estados[retiro_listo.pk] == "listo_para_recoger"
        assert estados[retiro_preparando.pk] == "en_preparacion"
        assert estados[retiro_entregado.pk] == "entregado"
        # Domicilio no cambia en nada.
        assert estados[domicilio_en_camino.pk] == "en_camino"
    finally:
        # Deja la base en el último estado para el resto de la suite.
        ejecutor = MigrationExecutor(connection)
        ejecutor.migrate(ejecutor.loader.graph.leaf_nodes())
