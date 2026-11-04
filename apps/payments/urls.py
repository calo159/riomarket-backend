"""Rutas del API de pagos."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.payments.views import (
    ComisionesView,
    LiquidacionesView,
    PagoViewSet,
    PagoWebhookView,
    VentasView,
)

router = DefaultRouter()
router.register("pagos", PagoViewSet, basename="pago")

urlpatterns = [
    path("webhook/<str:proveedor>/", PagoWebhookView.as_view(), name="pago-webhook"),
    path("ventas/", VentasView.as_view(), name="pago-ventas"),
    path("comisiones/", ComisionesView.as_view(), name="comisiones"),
    path("comisiones/liquidaciones/", LiquidacionesView.as_view(), name="liquidaciones-comision"),
    *router.urls,
]
