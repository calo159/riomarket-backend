"""Pruebas de los endpoints de autenticación (registro, login, refresh,
logout con blacklist y perfil)."""

import pytest
from django.core.cache import cache
from rest_framework import status

from apps.accounts.models import Usuario
from tests.factories import UsuarioFactory

PASSWORD = "ClaveSegura1!"


def _registro(correo="pepe@riomarket.test", celular="3001234567", rol="comprador"):
    return {
        "nombre": "Pepe Pimienta",
        "correo": correo,
        "celular": celular,
        "rol": rol,
        "password": PASSWORD,
    }


@pytest.mark.django_db
class TestRegistro:
    URL = "/api/auth/registro/"

    def test_registro_comprador_ok(self, api_client):
        respuesta = api_client.post(self.URL, _registro(), format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        cuerpo = respuesta.data
        assert cuerpo["rol"] == Usuario.Rol.COMPRADOR
        assert "password" not in cuerpo
        usuario = Usuario.objects.get(correo="pepe@riomarket.test")
        assert usuario.check_password(PASSWORD)

    def test_registro_vendedor_ok(self, api_client):
        respuesta = api_client.post(self.URL, _registro(rol="vendedor"), format="json")
        assert respuesta.status_code == status.HTTP_201_CREATED
        assert respuesta.data["rol"] == Usuario.Rol.VENDEDOR

    def test_registro_rol_administrador_rechazado(self, api_client):
        respuesta = api_client.post(self.URL, _registro(rol="administrador"), format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "rol" in respuesta.data["errors"]

    def test_registro_correo_duplicado_ignora_mayusculas(self, api_client):
        UsuarioFactory(correo="PEPE@riomarket.test", password=PASSWORD)
        # El registro en mayúsculas esquiva el UniqueValidator exacto del
        # serializer; la capa de servicios lo normaliza y lo detecta (400).
        cuerpo = _registro()
        cuerpo["correo"] = "PEPE@RIOMARKET.TEST"
        respuesta = api_client.post(self.URL, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "Ya existe una cuenta con ese correo" in str(respuesta.data["errors"])

    def test_registro_celular_duplicado_con_prefijo_pais(self, api_client):
        UsuarioFactory(celular="3001234567", password=PASSWORD)
        respuesta = api_client.post(self.URL, _registro(celular="+57 300 123 4567"), format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
        assert "Ya existe una cuenta con ese celular" in str(respuesta.data["errors"])

    def test_registro_password_corta(self, api_client):
        cuerpo = _registro()
        cuerpo["password"] = "corta1"
        respuesta = api_client.post(self.URL, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_registro_password_debil_rechazada(self, api_client):
        cuerpo = _registro()
        cuerpo["password"] = "12345678"
        respuesta = api_client.post(self.URL, cuerpo, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST

    def test_registro_celular_con_letras(self, api_client):
        respuesta = api_client.post(self.URL, _registro(celular="300A12B4567"), format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    URL = "/api/auth/login/"

    def _login(self, api_client, correo, clave=PASSWORD):
        return api_client.post(self.URL, {"correo": correo, "password": clave}, format="json")

    def test_login_ok_devuelve_tokens_y_usuario(self, api_client):
        usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password=PASSWORD)
        respuesta = self._login(api_client, usuario.correo)
        assert respuesta.status_code == status.HTTP_200_OK
        cuerpo = respuesta.data
        assert "access" in cuerpo and "refresh" in cuerpo
        assert cuerpo["usuario"]["rol"] == Usuario.Rol.VENDEDOR
        assert cuerpo["usuario"]["id"] == usuario.pk

    def test_login_password_incorrecta(self, api_client):
        usuario = UsuarioFactory(password=PASSWORD)
        respuesta = self._login(api_client, usuario.correo, "MalaClave9!")
        assert respuesta.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_usuario_suspendido(self, api_client):
        usuario = UsuarioFactory(password=PASSWORD)
        usuario.suspendir()
        respuesta = self._login(api_client, usuario.correo)
        assert respuesta.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_throttling_por_scope(self, api_client, monkeypatch):
        from rest_framework.throttling import SimpleRateThrottle

        # ScopedRateThrottle lee rates desde esta clase (reactivada en import);
        # monkeypatch evita la fragilidad de override_settings sobre el mismo.
        monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {"login": "2/min"})
        cache.clear()
        try:
            usuario = UsuarioFactory(password=PASSWORD)
            for _ in range(2):
                assert self._login(api_client, usuario.correo).status_code == 200
            tercera = self._login(api_client, usuario.correo)
            assert tercera.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        finally:
            cache.clear()


@pytest.mark.django_db
class TestRefreshYLogout:
    REFRESH = "/api/auth/token/refresh/"

    def test_refresh_rota_y_blanquea_el_anterior(self, api_client):
        usuario = UsuarioFactory(password=PASSWORD)
        login = api_client.post(
            "/api/auth/login/",
            {"correo": usuario.correo, "password": PASSWORD},
            format="json",
        )
        refresh_viejo = login.data["refresh"]

        uso = api_client.post(self.REFRESH, {"refresh": refresh_viejo}, format="json")
        assert uso.status_code == status.HTTP_200_OK
        assert "refresh" in uso.data  # rotación

        reuso = api_client.post(self.REFRESH, {"refresh": refresh_viejo}, format="json")
        assert reuso.status_code == status.HTTP_401_UNAUTHORIZED

        nuevo = api_client.post(self.REFRESH, {"refresh": uso.data["refresh"]}, format="json")
        assert nuevo.status_code == status.HTTP_200_OK

    def test_logout_blanquea_el_refresh(self, api_client):
        usuario = UsuarioFactory(password=PASSWORD)
        login = api_client.post(
            "/api/auth/login/",
            {"correo": usuario.correo, "password": PASSWORD},
            format="json",
        )
        access = login.data["access"]
        refresh = login.data["refresh"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        salida = api_client.post("/api/auth/logout/", {"refresh": refresh}, format="json")
        assert salida.status_code == status.HTTP_204_NO_CONTENT

        reuso = api_client.post(self.REFRESH, {"refresh": refresh}, format="json")
        assert reuso.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_sin_token_autenticacion(self, api_client):
        respuesta = api_client.post("/api/auth/logout/", {"refresh": "asdf"}, format="json")
        assert respuesta.status_code in (status.HTTP_401_UNAUTHORIZED,)


@pytest.mark.django_db
class TestPerfil:
    URL = "/api/auth/perfil/"

    def test_perfil_requiere_autenticacion(self, api_client):
        assert api_client.get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_perfil_lee_el_propio_usuario(self, api_client):
        usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR, password=PASSWORD)
        api_client.force_authenticate(usuario)
        respuesta = api_client.get(self.URL)
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["id"] == usuario.pk
        assert respuesta.data["rol"] == Usuario.Rol.VENDEDOR

    def test_perfil_actualiza_nombre_y_celular(self, api_client):
        usuario = UsuarioFactory(password=PASSWORD)
        api_client.force_authenticate(usuario)
        respuesta = api_client.patch(
            self.URL,
            {"nombre": "Nuevo Nombre", "celular": "+57 301 987 6543"},
            format="json",
        )
        assert respuesta.status_code == status.HTTP_200_OK
        usuario.refresh_from_db()
        assert usuario.nombre == "Nuevo Nombre"
        assert usuario.celular == "3019876543"

    def test_perfil_no_expone_password_y_rol_es_inmutable(self, api_client):
        usuario = UsuarioFactory(password=PASSWORD)
        api_client.force_authenticate(usuario)
        respuesta = api_client.patch(self.URL, {"rol": Usuario.Rol.ADMINISTRADOR}, format="json")
        assert respuesta.status_code == status.HTTP_200_OK
        assert "password" not in respuesta.data
        usuario.refresh_from_db()
        assert usuario.rol == Usuario.Rol.COMPRADOR

    def test_perfil_correo_en_uso_por_otro_rechazado(self, api_client):
        otro = UsuarioFactory(password=PASSWORD)
        usuario = UsuarioFactory(password=PASSWORD)
        api_client.force_authenticate(usuario)
        respuesta = api_client.patch(self.URL, {"correo": otro.correo.upper()}, format="json")
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
