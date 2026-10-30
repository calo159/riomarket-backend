"""Rutas del API de autenticación y perfil."""

from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from apps.accounts.views import (
    CambiarContrasenaView,
    CookieTokenRefreshView,
    LoginView,
    LogoutView,
    PerfilView,
    RecuperarContrasenaView,
    RegistroView,
    RestablecerContrasenaView,
)
from apps.rbac.views import MenuView

urlpatterns = [
    path("registro/", RegistroView.as_view(), name="auth-registro"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("perfil/", PerfilView.as_view(), name="auth-perfil"),
    path("menu/", MenuView.as_view(), name="auth-menu"),
    path(
        "perfil/cambiar-contrasena/",
        CambiarContrasenaView.as_view(),
        name="auth-cambiar-contrasena",
    ),
    path(
        "recuperar-contrasena/",
        RecuperarContrasenaView.as_view(),
        name="auth-recuperar-contrasena",
    ),
    path(
        "restablecer-contrasena/",
        RestablecerContrasenaView.as_view(),
        name="auth-restablecer-contrasena",
    ),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="auth-token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="auth-token-verify"),
]
