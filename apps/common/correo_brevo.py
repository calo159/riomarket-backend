"""Envío de correo por la API HTTP de Brevo.

Render (plan gratis) bloquea los puertos SMTP, así que el correo sale por HTTPS. Se activa
solo cuando existe ``BREVO_API_KEY``; sin ella, Django usa el backend que corresponda al
entorno. No añade dependencias.
"""

import json
import logging
from email.utils import parseaddr
from urllib import error, request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

URL_ENVIO = "https://api.brevo.com/v3/smtp/email"
ESPERA_SEGUNDOS = 10


def _correo(direccion: str) -> str:
    """Solo la dirección, sin el nombre: «Ana <ana@x.co>» → «ana@x.co»."""
    return parseaddr(direccion)[1]


class BrevoEmailBackend(BaseEmailBackend):
    """Un correo por mensaje; devuelve cuántos se aceptaron.

    Nunca registra el cuerpo ni el destinatario: el cuerpo puede llevar un token de acceso.
    """

    def send_messages(self, email_messages):
        enviados = 0
        for mensaje in email_messages:
            if not mensaje.to:
                continue
            remitente = _correo(mensaje.from_email or settings.DEFAULT_FROM_EMAIL)
            cuerpo = {
                "sender": {"name": "RioMarket", "email": remitente},
                "to": [{"email": _correo(a)} for a in mensaje.to],
                "subject": mensaje.subject,
                "textContent": mensaje.body,
            }
            peticion = request.Request(
                URL_ENVIO,
                data=json.dumps(cuerpo).encode("utf-8"),
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json",
                    "accept": "application/json",
                },
                method="POST",
            )
            try:
                with request.urlopen(peticion, timeout=ESPERA_SEGUNDOS):
                    enviados += 1
            except (error.URLError, TimeoutError) as exc:
                # Solo el motivo: ni el destinatario ni el cuerpo van al registro.
                logger.warning("Brevo no recibió un correo: %s", getattr(exc, "reason", exc))
                if not self.fail_silently:
                    raise
        return enviados
