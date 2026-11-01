"""Envío de correo por la API de Brevo (sin salir a internet)."""

import json
import logging
from unittest import mock
from urllib import error

import pytest
from django.core.mail import EmailMessage

from apps.common.correo_brevo import URL_ENVIO, BrevoEmailBackend

URLOPEN = "apps.common.correo_brevo.request.urlopen"


@pytest.fixture
def clave(settings):
    settings.BREVO_API_KEY = "clave-de-prueba"
    settings.DEFAULT_FROM_EMAIL = "RioMarket <no-responder@riomarket.co>"


def _mensaje():
    return EmailMessage(subject="Hola", body="Cuerpo con TOKEN123", to=["Ana <ana@example.com>"])


def test_envia_remitente_destinatario_y_cuerpo_a_la_api(clave):
    with mock.patch(URLOPEN) as urlopen:
        enviados = BrevoEmailBackend().send_messages([_mensaje()])

    assert enviados == 1
    peticion = urlopen.call_args.args[0]
    assert peticion.full_url == URL_ENVIO
    assert peticion.get_header("Api-key") == "clave-de-prueba"
    cuerpo = json.loads(peticion.data)
    assert cuerpo["sender"]["email"] == "no-responder@riomarket.co"
    assert cuerpo["to"] == [{"email": "ana@example.com"}]
    assert cuerpo["subject"] == "Hola"
    assert cuerpo["textContent"] == "Cuerpo con TOKEN123"


def test_un_fallo_de_red_no_rompe_el_flujo_y_no_filtra_datos_al_registro(clave, caplog):
    with (
        mock.patch(URLOPEN, side_effect=error.URLError("sin red")),
        caplog.at_level(logging.WARNING),
    ):
        enviados = BrevoEmailBackend(fail_silently=True).send_messages([_mensaje()])

    assert enviados == 0
    assert "TOKEN123" not in caplog.text
    assert "ana@example.com" not in caplog.text


def test_sin_fail_silently_el_error_se_propaga(clave):
    with (
        mock.patch(URLOPEN, side_effect=error.URLError("sin red")),
        pytest.raises(error.URLError),
    ):
        BrevoEmailBackend().send_messages([_mensaje()])


def test_ignora_mensajes_sin_destinatario(clave):
    with mock.patch(URLOPEN) as urlopen:
        enviados = BrevoEmailBackend().send_messages([EmailMessage(subject="x", body="y", to=[])])

    assert enviados == 0
    urlopen.assert_not_called()
