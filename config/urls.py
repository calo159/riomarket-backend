"""URLs raíz del proyecto RioMarket."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.common.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health"),
    # Documentación OpenAPI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/docs/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # APIs por módulo
    path("api/auth/", include("apps.accounts.urls")),
    path("api/verificacion/", include("apps.accounts.verificacion_urls")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/addresses/", include("apps.addresses.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/promotions/", include("apps.promotions.urls")),
    path("api/audit/", include("apps.audit.urls")),
]

# Solo en DEBUG: sirve los archivos PÚBLICOS subidos (imágenes de producto).
# Las fotos de cédula viven en PRIVATE_MEDIA_ROOT y jamás entran aquí.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
