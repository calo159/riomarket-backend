"""Rutas del API de pagos."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.payments.views import PagoViewSet, PagoWebhookView, VentasView

router = DefaultRouter()
router.register("pagos", PagoViewSet, basename="pago")

urlpatterns = [
    path("webhook/<str:proveedor>/", PagoWebhookView.as_view(), name="pago-webhook"),
    path("ventas/", VentasView.as_view(), name="pago-ventas"),
    *router.urls,
]
