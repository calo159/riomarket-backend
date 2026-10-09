"""Rutas del API de direcciones."""

from rest_framework.routers import DefaultRouter

from apps.addresses.views import DireccionViewSet

router = DefaultRouter()
router.register("direcciones", DireccionViewSet, basename="direccion")

urlpatterns = router.urls
