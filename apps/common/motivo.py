"""Motivo obligatorio de las acciones sensibles de administración."""

from django.core.exceptions import ValidationError

MOTIVO_MIN = 5
MOTIVO_MAX = 300


def validar_motivo(motivo: str | None, *, campo: str = "motivo") -> str:
    """Devuelve el motivo sin espacios sobrantes o lanza ValidationError (400)."""
    motivo = (motivo or "").strip()
    if not MOTIVO_MIN <= len(motivo) <= MOTIVO_MAX:
        raise ValidationError(
            {campo: f"Indica un motivo de {MOTIVO_MIN} a {MOTIVO_MAX} caracteres."}
        )
    return motivo
