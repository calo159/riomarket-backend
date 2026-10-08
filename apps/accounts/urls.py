"""Rutas del API de autenticación y perfil."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.accounts.views import LoginView, LogoutView, PerfilView, RegistroView

urlpatterns = [
    path("registro/", RegistroView.as_view(), name="auth-registro"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("perfil/", PerfilView.as_view(), name="auth-perfil"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="auth-token-verify"),
]
