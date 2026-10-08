"""Fixtures compartidas para toda la suite."""

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    """Cliente de pruebas sin autenticar."""
    return APIClient()
