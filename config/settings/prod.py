"""Entorno de producción: exige variables de entorno y activa seguridad."""

from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")
# Orígenes HTTPS reales del panel/administración (nunca "*")
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
# El health check de Render llega por HTTP interno: nunca redirigirlo a HTTPS.
SECURE_REDIRECT_EXEMPT = [r"^api/health/?$"]
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Si REDIS_URL está definido se usa caché compartida; si no, LocMem funciona
# sin infraestructura extra (suficiente para una demo en el plan free).
_redis_url = env("REDIS_URL", default="")
if _redis_url:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_url,
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# Frontend unificado: WhiteNoise sirve los assets del build de Vite.
# El index.html lo entrega Django para que apliquen las cabeceras de seguridad.
WHITENOISE_ROOT = BASE_DIR / "frontend" / "dist"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}
