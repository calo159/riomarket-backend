"""La lectura de los ajustes del panel: caché corta, descarte al guardar y tolerancia a fallos."""

from decimal import Decimal

import pytest
from django.db import DatabaseError

from apps.common import ajustes
from apps.configuracion import lectura
from apps.configuracion.models import ConfiguracionPlataforma

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("ajustes_del_panel")]


@pytest.fixture(autouse=True)
def _servidor(settings):
    settings.PLATFORM_COMMISSION_PERCENTAGE = "8.00"


def test_sin_fila_rige_settings():
    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == "8.00"


def test_con_valor_en_el_panel_gana_a_settings():
    ConfiguracionPlataforma.objects.create(pk=1, comision_porcentaje=Decimal("5"))

    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == Decimal("5.00")


def test_un_campo_vacio_en_el_panel_deja_a_settings():
    ConfiguracionPlataforma.objects.create(pk=1, tarifa_domicilio=Decimal("1000"))

    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == "8.00"


def test_ajuste_que_no_es_editable_siempre_viene_de_settings(settings):
    settings.OTRO_AJUSTE = "x"
    ConfiguracionPlataforma.objects.create(pk=1, comision_porcentaje=Decimal("5"))

    assert ajustes.valor("OTRO_AJUSTE") == "x"
    assert ajustes.valor("NO_EXISTE", "por defecto") == "por defecto"


def test_la_lectura_se_guarda_unos_segundos_y_guardar_la_descarta(
    django_assert_num_queries, settings
):
    settings.AJUSTES_CACHE_SEGUNDOS = 600
    fila = ConfiguracionPlataforma.objects.create(pk=1, comision_porcentaje=Decimal("5"))
    lectura.invalidar()

    with django_assert_num_queries(1):
        ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE")
        ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE")
        ajustes.valor("DOMICILIO_TARIFA_BASE")

    fila.comision_porcentaje = Decimal("3")
    fila.save()  # la señal descarta lo guardado en memoria

    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == Decimal("3.00")


def test_la_caja_vencida_vuelve_a_leer_la_base(settings):
    settings.AJUSTES_CACHE_SEGUNDOS = 0
    ConfiguracionPlataforma.objects.create(pk=1, comision_porcentaje=Decimal("5"))
    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == Decimal("5.00")

    # Otro proceso cambia la fila sin pasar por la señal de este.
    ConfiguracionPlataforma.objects.filter(pk=1).update(comision_porcentaje=Decimal("2"))

    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == Decimal("2.00")


def test_si_la_base_falla_se_sigue_con_settings(monkeypatch):
    def romper(*args, **kwargs):
        raise DatabaseError("sin base")

    monkeypatch.setattr(lectura.ConfiguracionPlataforma.objects, "filter", romper)
    lectura.invalidar()

    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == "8.00"


def test_si_la_base_falla_se_conserva_lo_ultimo_que_se_supo(monkeypatch, settings):
    settings.AJUSTES_CACHE_SEGUNDOS = 0
    ConfiguracionPlataforma.objects.create(pk=1, comision_porcentaje=Decimal("5"))
    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == Decimal("5.00")

    def romper(*args, **kwargs):
        raise DatabaseError("sin base")

    monkeypatch.setattr(lectura.ConfiguracionPlataforma.objects, "filter", romper)

    assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == Decimal("5.00")


def test_con_la_lectura_apagada_no_toca_la_base(settings, django_assert_num_queries):
    settings.AJUSTES_EN_BASE_DE_DATOS = False
    ConfiguracionPlataforma.objects.create(pk=1, comision_porcentaje=Decimal("5"))

    with django_assert_num_queries(0):
        assert ajustes.valor("PLATFORM_COMMISSION_PERCENTAGE") == "8.00"
