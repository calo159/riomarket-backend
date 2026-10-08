"""Pruebas del cifrado de datos sensibles (cédula)."""

import pytest
from cryptography.fernet import Fernet
from django.conf import settings

from apps.common import crypto


@pytest.fixture(autouse=True)
def _reset_cache():
    crypto.reiniciar_cache()
    yield
    crypto.reiniciar_cache()


def test_clave_de_entorno_es_valida():
    # Si la clave fuera inválida, el proyecto no arrancaría (falla en settings)
    Fernet(settings.FERNET_KEY.encode("ascii"))


def test_cifrar_descifrar_roundtrip():
    token = crypto.cifrar("1234567890")
    assert token != b"1234567890"
    assert crypto.descifrar(token) == "1234567890"


def test_mismo_dato_produce_tokens_distintos():
    """Fernet usa IV aleatorio: por eso la unicidad se resuelve con HMAC."""
    assert crypto.cifrar("1234567890") != crypto.cifrar("1234567890")


def test_huella_es_deterministica_y_unica():
    assert crypto.huella_deterministica("123") == crypto.huella_deterministica("123")
    assert crypto.huella_deterministica("123") != crypto.huella_deterministica("124")


def test_huella_no_revela_el_dato():
    huella = crypto.huella_deterministica("1032456789")
    assert "1032456789" not in huella


def test_descifrar_con_clave_incorrecta_lanza_error(monkeypatch):
    token = crypto.cifrar("1234567890")
    monkeypatch.setattr(settings, "FERNET_KEY", Fernet.generate_key().decode("ascii"))
    crypto.reiniciar_cache()
    with pytest.raises(ValueError, match="Token inv"):
        crypto.descifrar(token)


def test_no_se_puede_cifrar_vacio():
    with pytest.raises(ValueError):
        crypto.cifrar("")


def test_normalizar_cedula():
    assert crypto.normalizar_cedula("0123456789") == "123456789"
    assert crypto.normalizar_cedula("1.234.567.890") == "1234567890"
