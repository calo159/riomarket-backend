"""Entorno de pruebas (pytest-django).

- Usa la misma base de datos que indique DATABASE_URL (PostgreSQL en local/CI),
  para que los CheckConstraint y restricciones se comporten como en producción.
- Throttles con límites altos para no interferir; el rate limiting real se
  prueba con overrides en los tests específicos.

En una máquina limpia (sin .env) la suite debe correr con un solo comando:
las variables obligatorias de ``base.py`` se fijan aquí con ``setdefault``
antes de importar la configuración base. Si existe un ``.env`` real (local),
sus valores tienen prioridad... salvo las claves de test que fijamos abajo.
"""

import os

# --- Valores por defecto SOLO para tests (nunca usar en producción) ---------
# SECRET_KEY ≥ 32 bytes: evita InsecureKeyLengthWarning en simplejwt.
os.environ.setdefault(
    "SECRET_KEY", "test-secret-key-riomarket-0123456789abcdefghijklmnopqrstuvwxyz"
)
# Clave Fernet válida (32 bytes base64url) para cifrar datos sensibles en tests.
os.environ.setdefault("FERNET_KEY", "5yje5UOGK7sn3fg3xean97SK9QMXDRl-jS8LiAKULP8=")
os.environ.setdefault("DEBUG", "False")
# Pagos: la pasarela sandbox SÍ se habilita en tests.
os.environ.setdefault("PAYMENTS_SANDBOX_ENABLED", "True")

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
        "pagos": "10000/min",
    },
}

# Archivos subidos en tests: directorio temporal
MEDIA_ROOT = BASE_DIR / "test_media"

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
}
