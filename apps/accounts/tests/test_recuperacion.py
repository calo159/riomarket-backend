"""Recuperación y cambio de contraseña: hallazgos S-04 y S-05."""

import logging

import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts import services
from apps.accounts.models import TokenRecuperacion
from tests.factories import UsuarioFactory

pytestmark = pytest.mark.django_db
NUEVA = "OtraClaveSegura9!"


class TestSolicitar:
    def test_el_token_no_se_escribe_en_los_logs_fuera_de_debug(self, settings, caplog):
        settings.DEBUG = False
        usuario = UsuarioFactory()
        with caplog.at_level(logging.INFO):
            services.solicitar_recuperacion(correo=usuario.correo)
        token = TokenRecuperacion.objects.get(usuario=usuario).token
        assert token not in caplog.text

    def test_envia_el_token_por_correo_si_el_envio_esta_habilitado(self, settings):
        settings.NOTIFICATIONS_EMAIL_ENABLED = True
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        usuario = UsuarioFactory()
        services.solicitar_recuperacion(correo=usuario.correo)
        token = TokenRecuperacion.objects.get(usuario=usuario).token
        assert len(mail.outbox) == 1
        assert token in mail.outbox[0].body

    def test_un_token_nuevo_invalida_los_anteriores(self):
        usuario = UsuarioFactory()
        services.solicitar_recuperacion(correo=usuario.correo)
        services.solicitar_recuperacion(correo=usuario.correo)
        assert TokenRecuperacion.objects.filter(usuario=usuario, usado=False).count() == 1


class TestRestablecer:
    def _token(self, usuario):
        services.solicitar_recuperacion(correo=usuario.correo)
        return TokenRecuperacion.objects.get(usuario=usuario, usado=False).token

    def test_cambia_la_clave_y_el_token_es_de_un_solo_uso(self):
        usuario = UsuarioFactory()
        token = self._token(usuario)
        services.restablecer_contrasena(token=token, nueva=NUEVA)
        usuario.refresh_from_db()
        assert usuario.check_password(NUEVA)
        with pytest.raises(Exception, match="Token inválido"):
            services.restablecer_contrasena(token=token, nueva=NUEVA)

    def test_restablecer_cierra_las_sesiones_abiertas(self):
        usuario = UsuarioFactory()
        refresh = RefreshToken.for_user(usuario)
        services.restablecer_contrasena(token=self._token(usuario), nueva=NUEVA)
        assert BlacklistedToken.objects.filter(token__user=usuario).count() == 1
        respuesta = APIClient().post(
            "/api/auth/token/refresh/",
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
            HTTP_COOKIE=f"rm_refresh={refresh}",
        )
        assert respuesta.status_code == 401

    def test_cambiar_la_contrasena_cierra_las_demas_sesiones(self):
        usuario = UsuarioFactory(password="ClaveSegura1!")
        RefreshToken.for_user(usuario)
        services.cambiar_contrasena(usuario=usuario, actual="ClaveSegura1!", nueva=NUEVA)
        assert BlacklistedToken.objects.filter(token__user=usuario).count() == 1
