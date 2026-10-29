"""Rutas del API de administración."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.administration.views import ResumenAdminView, UsuarioAdminViewSet

router = DefaultRouter()
router.register("usuarios", UsuarioAdminViewSet, basename="admin-usuario")

urlpatterns = [
    path("resumen/", ResumenAdminView.as_view(), name="admin-resumen"),
    *router.urls,
]
