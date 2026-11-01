"""El catálogo define el punto de extensión; ``reviews`` registra la reputación al arrancar."""

import pytest

from apps.catalog import anotaciones
from apps.catalog.models import Puesto

pytestmark = pytest.mark.django_db


def test_reviews_registra_sus_anotadores_al_arrancar():
    assert {anotaciones.REPUTACION, anotaciones.CALIFICACION_DEL_PUESTO} <= set(
        anotaciones._ANOTADORES
    )


def test_sin_anotador_registrado_la_consulta_queda_igual(monkeypatch):
    monkeypatch.setattr(anotaciones, "_ANOTADORES", {})
    consulta = Puesto.objects.all()

    assert anotaciones.anotar(anotaciones.REPUTACION, consulta) is consulta


def test_con_anotador_registrado_se_aplica(monkeypatch):
    monkeypatch.setattr(anotaciones, "_ANOTADORES", {})
    anotaciones.registrar_anotador("marca", lambda consulta: consulta.none())

    assert list(anotaciones.anotar("marca", Puesto.objects.all())) == []
