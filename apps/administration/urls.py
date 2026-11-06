"""Rutas del API de administración."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.administration.views import (
    ConfiguracionAdminView,
    PersonalizacionAdminView,
    RecursoAdminViewSet,
    ResumenAdminView,
    RolAdminViewSet,
    UsuarioAdminViewSet,
)

router = DefaultRouter()
router.register("usuarios", UsuarioAdminViewSet, basename="admin-usuario")
router.register("roles", RolAdminViewSet, basename="admin-rol")
router.register("recursos", RecursoAdminViewSet, basename="admin-recurso")

urlpatterns = [
    path("resumen/", ResumenAdminView.as_view(), name="admin-resumen"),
    path("configuracion/", ConfiguracionAdminView.as_view(), name="admin-configuracion"),
    path("personalizacion/", PersonalizacionAdminView.as_view(), name="admin-personalizacion"),
    *router.urls,
]
