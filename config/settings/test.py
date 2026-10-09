"""Entorno de pruebas (pytest-django).

- Usa la misma base de datos que indique DATABASE_URL (PostgreSQL en local/CI),
  para que los CheckConstraint y restricciones se comporten como en producción.
- Throttles con límites altos para no interferir; el rate limiting real se
  prueba con overrides en los tests específicos.
"""

from .base import *

DEBUG = False

PASSWORD_HASHERS = [
    # Hash rápido para tests (la seguridad se garantiza en settings de prod)
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/min",
        "login": "10000/min",
        "register": "10000/min",
        "user": "10000/min",
        "verificacion": "10000/min",
    },
}

# Archivos subidos en tests: directorio temporal
MEDIA_ROOT = BASE_DIR / "test_media"

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
}
