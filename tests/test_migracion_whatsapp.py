"""Migración de datos 0006: ningún puesto existente publica el celular por defecto."""

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

from apps.catalog.models import Puesto
from tests.factories import PuestoFactory

ANTES = ("catalog", "0005_whatsapp_privado_por_defecto")
DATOS = ("catalog", "0006_whatsapp_desactivado_en_puestos_existentes")


def _migrar(destino):
    MigrationExecutor(connection).migrate([destino])


@pytest.mark.django_db(transaction=True)
def test_la_migracion_apaga_el_whatsapp_de_los_puestos_existentes_y_es_reversible():
    uno = PuestoFactory()
    otro = PuestoFactory()
    try:
        # Estado heredado: el default antiguo dejó todos en True sin que nadie lo eligiera.
        _migrar(ANTES)
        Puesto.objects.update(acepta_whatsapp=True)

        _migrar(DATOS)
        assert not Puesto.objects.filter(pk__in=[uno.pk, otro.pk], acepta_whatsapp=True).exists()

        # Marcha atrás sin error; al volver a avanzar vuelve a apagarse lo que siga en True.
        _migrar(ANTES)
        Puesto.objects.filter(pk=uno.pk).update(acepta_whatsapp=True)
        _migrar(DATOS)
        assert Puesto.objects.get(pk=uno.pk).acepta_whatsapp is False
    finally:
        ejecutor = MigrationExecutor(connection)
        ejecutor.migrate(ejecutor.loader.graph.leaf_nodes())
