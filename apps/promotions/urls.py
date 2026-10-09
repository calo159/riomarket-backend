from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.promotions.views import CuponViewSet

router = DefaultRouter()
router.register(r"cupones", CuponViewSet, basename="cupon")

urlpatterns = [path("", include(router.urls))]
