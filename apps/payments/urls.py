"""Rutas del API de pagos."""

from rest_framework.routers import DefaultRouter

from apps.payments.views import PagoViewSet

router = DefaultRouter()
router.register("pagos", PagoViewSet, basename="pago")
urlpatterns = router.urls
