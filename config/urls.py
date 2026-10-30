"""URLs raíz del proyecto RioMarket con frontend servible."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as servir_archivo
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.common.views import ArchivoFrontendView, FrontendCatchAllView, HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
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
    path("api/admin/", include("apps.administration.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # En producción no hay servidor de medios: Django entrega las subidas
    # públicas (avatares/imágenes de producto). El disco de Render es efímero.
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            servir_archivo,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]

# Servir SPA
frontend_dist = settings.BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    urlpatterns += [
        # Archivos reales del build que no son rutas de la aplicación. En producción WhiteNoise
        # ya los entrega antes de llegar aquí; esta ruta cubre el resto de entornos y evita que
        # el catch-all los sustituya por index.html.
        re_path(
            r"^(?P<path>sw\.js|offline\.html|offline\.js|manifest\.webmanifest|favicon\.svg"
            r"|theme-init\.js|icons/[\w.-]+)$",
            ArchivoFrontendView.as_view(),
        ),
        re_path(
            r"^(?!api/|admin/|static/|media/|assets/|schema/|docs/|theme-init\.js$)"
            r".*$",
            FrontendCatchAllView.as_view(),
        ),
    ]
