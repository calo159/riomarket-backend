"""Middleware para cabeceras de seguridad en respuestas del frontend/API."""

from urllib.parse import urlsplit

from django.conf import settings

# Prefijos cuyas plantillas (Swagger UI / Redoc de drf-spectacular) cargan
# scripts y estilos desde CDN e incluyen un script inline de arranque.
PREFIJOS_DOCS = ("/api/docs/",)
# El admin de Django usa scripts inline en formularios, inlines y popups.
PREFIJOS_ADMIN = ("/admin/",)


def _origen_de_medios() -> str:
    """Origen (``https://host``) de las fotos cuando viven en un almacén externo (S3/Supabase).

    Con ``MEDIA_URL`` relativo las fotos salen del propio dominio y ``'self'`` ya basta.
    """
    partes = urlsplit(str(getattr(settings, "MEDIA_URL", "") or ""))
    if partes.scheme in ("http", "https") and partes.netloc:
        return f"{partes.scheme}://{partes.netloc}"
    return ""


def _img_src(*extra: str) -> str:
    origenes = ["'self'", "data:", "blob:", *extra]
    medios = _origen_de_medios()
    if medios and medios not in origenes:
        origenes.append(medios)
    return "img-src " + " ".join(origenes)


def _csp(request) -> str:
    if request.path.startswith(PREFIJOS_ADMIN):
        return "; ".join(
            [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                _img_src("https://tile.openstreetmap.org"),
                "font-src 'self' data:",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
        )

    if request.path.startswith(PREFIJOS_DOCS):
        # CSP permisiva solo para la documentación interactiva. La app y la
        # API mantienen la política estricta de abajo.
        return "; ".join(
            [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net "
                "https://fonts.googleapis.com",
                "img-src 'self' data: blob: https://cdn.jsdelivr.net "
                "https://tile.openstreetmap.org",
                "font-src 'self' data: https://fonts.gstatic.com",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
        )

    return "; ".join(
        [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            _img_src("https://tile.openstreetmap.org"),
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
    )


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # No sobrescribir si ya existen
        if "X-Content-Type-Options" not in response:
            response["X-Content-Type-Options"] = "nosniff"
        if "X-Frame-Options" not in response:
            response["X-Frame-Options"] = "DENY"
        if "Referrer-Policy" not in response:
            response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if "Permissions-Policy" not in response:
            response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if (
            not settings.DEBUG
            and "Strict-Transport-Security" not in response
            and getattr(settings, "SECURE_HSTS_SECONDS", 0)
        ):
            response["Strict-Transport-Security"] = (
                f"max-age={settings.SECURE_HSTS_SECONDS}; includeSubDomains; preload"
            )
        if "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = _csp(request)
        return response
