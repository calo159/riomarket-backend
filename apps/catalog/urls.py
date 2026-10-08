"""Rutas del API de catálogo."""

from rest_framework.routers import DefaultRouter

from apps.catalog.views import (
    CategoriaViewSet,
    ImagenProductoViewSet,
    ProductoViewSet,
    PuestoViewSet,
)

router = DefaultRouter()
router.register("puestos", PuestoViewSet, basename="puesto")
router.register("productos", ProductoViewSet, basename="producto")
router.register("categorias", CategoriaViewSet, basename="categoria")
router.register("imagenes", ImagenProductoViewSet, basename="imagen")

urlpatterns = router.urls
