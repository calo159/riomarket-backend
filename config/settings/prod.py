"""Entorno de producción: exige variables de entorno y activa seguridad."""

import warnings

from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")
# Orígenes HTTPS reales del panel/administración (nunca "*")
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# En producción las tareas corren de verdad con Celery + Redis
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False

# Throttling y caché compartidos entre procesos (gunicorn + celery)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
    }
}

if not env.bool("PAYMENT_GATEWAY_SANDBOX", default=False):
    warnings.warn(
        "PAYMENT_GATEWAY_SANDBOX=False: verificar credenciales reales de la pasarela.",
        RuntimeWarning,
        stacklevel=2,
    )
