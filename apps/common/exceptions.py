"""Manejador de excepciones: respuestas de error consistentes en la API.

- Convierte ``django.core.exceptions.ValidationError`` (lanzado desde la capa
  de servicios) en ``rest_framework.exceptions.ValidationError`` (400).
- Convierte ``ProtectedError`` (FK PROTECT, p. ej. historial de pedidos) en
  un 400 con mensaje claro en vez de un 500.
- ``django.core.exceptions.PermissionDenied`` e ``Http404`` ya los convierte
  DRF por su cuenta, aquí solo se envuelve la respuesta con el formato
  estándar de RioMarket.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from rest_framework import exceptions
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        # FK PROTECT (p. ej. historial de pedidos que referencia un producto
        # o un puesto): sin esto Django lanzaría IntegrityError → 500.
        exc = exceptions.ValidationError(
            detail={
                "no_eliminable": (
                    "No se puede eliminar: registros relacionados lo "
                    "referencian (historial de pedidos). Desactívalo en vez de eliminarlo."
                )
            }
        )
    elif isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            detail = exc.message_dict
        else:
            detail = exc.messages
        exc = exceptions.ValidationError(detail=detail)

    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "success": False,
            "status_code": response.status_code,
            "errors": response.data,
        }
    return response
