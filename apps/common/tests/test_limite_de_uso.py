"""Al pasarse del límite de solicitudes, la API responde 429 con un mensaje que se entiende."""

import pytest
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

pytestmark = pytest.mark.django_db


@pytest.fixture
def limite_de_una(monkeypatch):
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "1/min", "user": "1/min"})
    cache.clear()
    yield
    cache.clear()


def test_el_mensaje_de_limite_esta_en_espanol_claro(api_client, limite_de_una):
    api_client.get("/api/catalog/categorias/")

    respuesta = api_client.get("/api/catalog/categorias/")

    assert respuesta.status_code == 429
    cuerpo = respuesta.json()
    assert cuerpo["success"] is False
    mensaje = cuerpo["errors"]["detail"]
    assert mensaje.startswith("Hiciste demasiadas solicitudes seguidas. Espera ")
    assert mensaje.endswith(" segundos e inténtalo de nuevo.")
    assert "throttled" not in mensaje


def test_el_limite_sigue_diciendo_cuanto_esperar_en_la_cabecera(api_client, limite_de_una):
    api_client.get("/api/catalog/categorias/")

    respuesta = api_client.get("/api/catalog/categorias/")

    assert int(respuesta["Retry-After"]) > 0
