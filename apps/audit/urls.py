from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.audit.views import RegistroAuditoriaViewSet

router = DefaultRouter()
router.register(r"registros", RegistroAuditoriaViewSet, basename="registro-auditoria")

urlpatterns = [path("", include(router.urls))]
