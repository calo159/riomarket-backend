"""Fixtures compartidas para toda la suite."""

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    """Cliente de pruebas sin autenticar."""
    return APIClient()


@pytest.fixture(autouse=True)
def _limpiar_cache():
    """Evita que el throttling (Anon/User/Scoped) se acumule entre tests.

    Las tablas se resetean test a test pero la cache (locmem) es de proceso:
    sin limpiarla, los límites de 60/min o 10/min para registro/login se
    cruzarían con la suma de toda la suite.
    """
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()
