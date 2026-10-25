"""Middleware para cabeceras de seguridad en respuestas del frontend/API."""

from django.conf import settings


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
        # CSP estricta básica para la app
        if "Content-Security-Policy" not in response:
            csp = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob: https://tile.openstreetmap.org",
                "font-src 'self' data:",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
            response["Content-Security-Policy"] = "; ".join(csp)
        return response
