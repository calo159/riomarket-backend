"""Pruebas del handler de excepciones (formato uniforme de errores)."""

from unittest.mock import MagicMock

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import NotFound

from apps.common.exceptions import api_exception_handler


def _resp(exc):
    return api_exception_handler(exc, MagicMock())


def test_error_de_validacion_da_400_con_formato_estandar():
    response = _resp(DjangoValidationError({"correo": ["Este campo es requerido."]}))
    assert response.status_code == 400
    assert response.data["success"] is False
    assert response.data["status_code"] == 400
    assert response.data["errors"]["correo"] == ["Este campo es requerido."]


def test_error_de_validacion_lista():
    response = _resp(DjangoValidationError(["Falta el precio."]))
    assert response.status_code == 400
    assert response.data["errors"] == ["Falta el precio."]


def test_error_de_api_de_drf():
    response = _resp(NotFound("No existe."))
    assert response.status_code == 404
    assert response.data["success"] is False
    assert response.data["errors"]["detail"] == "No existe."


def test_excepcion_no_manejada_devuelve_none():
    """Un error 500 inesperado debe propagarse (lo maneja Django)."""
    assert _resp(ValueError("boom")) is None
