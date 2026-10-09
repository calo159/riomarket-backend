"""Pruebas de la configuración de la API y del esquema OpenAPI."""

from rest_framework_simplejwt.authentication import JWTAuthentication


def test_extension_jwt_registrada_en_drfspectacular():
    """Regresión: sin esta extensión, drf-spectacular emite
    "could not resolve authenticator" en cada endpoint y documenta la API
    sin esquema de seguridad (el Authorizar de Swagger no funcionaría)."""
    from drf_spectacular.extensions import OpenApiAuthenticationExtension

    extension = OpenApiAuthenticationExtension.get_match(JWTAuthentication())
    assert extension is not None
    assert extension.name == "bearerAuth"


def test_esquema_openapi_se_genera(api_client):
    response = api_client.get("/api/schema/")
    assert response.status_code == 200
    contenido = response.content.decode("utf-8")
    assert "components" in contenido


def test_throttling_global_activo():
    """Regresión: ScopedRateThrottle como clase global NO limita nada
    (los endpoints sin throttle_scope pasan siempre)."""
    from django.conf import settings
    from rest_framework.settings import api_settings

    clases = [c.__name__ for c in api_settings.DEFAULT_THROTTLE_CLASSES]
    assert "AnonRateThrottle" in clases
    assert "UserRateThrottle" in clases
    assert "ScopedRateThrottle" not in clases

    rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    for scope in ("anon", "user", "login", "register", "verificacion"):
        assert scope in rates


def test_permiso_por_defecto_y_paginacion():
    from rest_framework.pagination import PageNumberPagination
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.settings import api_settings

    assert IsAuthenticated in api_settings.DEFAULT_PERMISSION_CLASSES
    assert issubclass(api_settings.DEFAULT_PAGINATION_CLASS, PageNumberPagination)


def test_jwt_con_rotacion_y_blacklist():
    from django.conf import settings

    jwt = settings.SIMPLE_JWT
    assert jwt["ROTATE_REFRESH_TOKENS"] is True
    assert jwt["BLACKLIST_AFTER_ROTATION"] is True
    assert jwt["ACCESS_TOKEN_LIFETIME"].total_seconds() <= 3600


def test_fernet_validado_al_arrancar():
    from cryptography.fernet import Fernet
    from django.conf import settings

    # Si la clave fuera inválida, el proyecto no arrancaría (ImproperlyConfigured)
    Fernet(settings.FERNET_KEY.encode("ascii"))
