"""Rutas del API de reseñas."""

from rest_framework.routers import DefaultRouter

from apps.reviews.views import ResenaViewSet

router = DefaultRouter()
router.register("resenas", ResenaViewSet, basename="resena")

urlpatterns = router.urls
