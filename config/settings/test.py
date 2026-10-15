"""Entorno de pruebas (pytest-django).

- Por defecto corre sobre **SQLite en memoria**: rápido, portable y sin depender
  de PostgreSQL local ni de la base remota (un pooler como el de Supabase hace
  inviable crear/borrar el runner de tests). Para verificar restricciones
  específicas de PostgreSQL, exporta ``TEST_DATABASE_URL`` antes de pytest.
- Precios y comisiones quedan deterministas (tarifa y % en ``0.00`` por defecto)
  para que el ``.env`` local no contamine los resultados; los tests que los
  necesitan los fijan con el fixture ``settings``.
- Throttles con límites altos para no interferir; el rate limiting real se
  prueba con overrides en los tests específicos.

En una máquina limpia (sin .env) la suite debe correr con un solo comando:
las variables obligatorias de ``base.py`` se fijan aquí con ``setdefault``
antes de importar la configuración base.
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
# Precios/comisiones deterministas en tests: los tests que necesitan comisión o
# tarifa las fijan con el fixture ``settings``. Así el .env local no contamina
# los resultados (antes heredaba los valores de desarrollo).
os.environ.setdefault("DOMICILIO_TARIFA_BASE", "0.00")
os.environ.setdefault("PLATFORM_COMMISSION_PERCENTAGE", "0.00")

from .base import *

DEBUG = False

# --- Base de datos de pruebas -----------------------------------------------
# Por defecto la suite corre contra SQLite en memoria: rápida, portable y sin
# depender de PostgreSQL local ni de la base remota (que en un pooler como el
# de Supabase hace inviable crear/borrar el runner de tests). Si se necesita
# PostgreSQL real (p. ej. para verificar CheckConstraints específicos), basta
# con exportar TEST_DATABASE_URL antes de correr pytest.
_test_database_url = os.environ.get("TEST_DATABASE_URL")
if _test_database_url:
    DATABASES = {"default": env.db_url_config(_test_database_url)}
    DATABASES["default"]["CONN_MAX_AGE"] = 0
elif "sqlite" not in DATABASES["default"].get("ENGINE", ""):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
            "CONN_MAX_AGE": 0,
        }
    }

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
