"""Pasarela de pagos: interfaz abstracta + implementación sandbox (ADR-003).

El backend no integra todavía un proveedor real. ``PasarelaPago`` define el
contrato que deberá cumplir Wompi/PayU/Mercado Pago; ``PasarelaSandbox``
implementa el comportamiento de pruebas (aprobación simulada y webhook con
firma HMAC). El endpoint ``simular`` y el método ``simulado`` solo funcionan
con la sandbox habilitada (``PAYMENTS_SANDBOX_ENABLED``).
"""

import hashlib
import hmac
from abc import ABC, abstractmethod
from typing import Any

from django.conf import settings


class PasarelaPago(ABC):
    """Contrato mínimo que debe cumplir cualquier pasarela real."""

    nombre = "base"

    @abstractmethod
    def crear_transaccion(self, *, pago) -> dict[str, Any]:
        """Inicia la transacción y devuelve datos de redirección/referencia."""

    @abstractmethod
    def verificar_firma(self, *, payload: bytes, firma: str) -> bool:
        """Valida que el webhook fue enviado por la pasarela (firma/secret)."""

    @abstractmethod
    def interpretar_evento(self, *, payload: dict[str, Any]) -> dict[str, Any]:
        """Normaliza el evento a ``{"referencia": str, "estado": "aprobado"|"rechazado"}``."""


class PasarelaSandbox(PasarelaPago):
    nombre = "sandbox"

    def crear_transaccion(self, *, pago) -> dict[str, Any]:
        return {"referencia": f"sandbox-{pago.pk}", "redirect_url": None}

    def verificar_firma(self, *, payload: bytes, firma: str) -> bool:
        secreto = (settings.PAYMENTS_WEBHOOK_SECRET or "").encode("utf-8")
        if not secreto or not firma:
            return False
        esperado = hmac.new(secreto, payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(esperado, firma)

    def interpretar_evento(self, *, payload: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(payload, dict) or "referencia" not in payload:
            raise ValueError("Evento inválido: falta 'referencia'.")
        estado = str(payload.get("estado", "")).lower()
        if estado not in {"aprobado", "rechazado"}:
            raise ValueError("Evento inválido: 'estado' debe ser 'aprobado' o 'rechazado'.")
        return {"referencia": str(payload["referencia"]), "estado": estado}


_PASARELAS: dict[str, type[PasarelaPago]] = {"sandbox": PasarelaSandbox}


def get_pasarela(nombre: str | None = None) -> PasarelaPago:
    """Devuelve la pasarela registrada por ``nombre`` (default: sandbox)."""
    clave = (nombre or "sandbox").lower()
    try:
        return _PASARELAS[clave]()
    except KeyError as exc:
        raise ValueError(f"Pasarela no soportada: '{nombre}'.") from exc
