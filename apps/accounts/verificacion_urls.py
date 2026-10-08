"""Rutas de verificación de identidad (``/api/verificacion/``)."""

from django.urls import path

from apps.accounts.verificacion_views import (
    CedulaPrivadaView,
    DecidirVerificacionView,
    SolicitudesAdminListView,
    SolicitudVerificacionView,
)

urlpatterns = [
    path("mi-verificacion/", SolicitudVerificacionView.as_view(), name="verificacion-mi"),
    path("solicitudes/", SolicitudesAdminListView.as_view(), name="verificacion-solicitudes"),
    path(
        "solicitudes/<int:pk>/",
        DecidirVerificacionView.as_view(),
        name="verificacion-decidir",
    ),
    path(
        "solicitudes/<int:pk>/cedula/",
        CedulaPrivadaView.as_view(),
        name="verificacion-cedula",
    ),
]
