"""Extensiones OpenAPI de drf-spectacular.

Sin esto, drf-spectacular no conoce ``JWTAuthentication`` de simplejwt y
emite el warning "could not resolve authenticator" en cada endpoint, dejando
la API sin esquema de seguridad documentado (el botón Authorizar de Swagger
no funcionaría).
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.plumbing import build_bearer_security_scheme_object


class JWTScheme(OpenApiAuthenticationExtension):
    target_class = "rest_framework_simplejwt.authentication.JWTAuthentication"
    name = "bearerAuth"
    priority = 1

    def get_security_definition(self, auto_schema):
        return build_bearer_security_scheme_object(
            header_name="Authorization", token_prefix="Bearer"
        )
