"""Configuración base compartida por todos los entornos.

Toda variable sensible se lee desde variables de entorno (django-environ).
Nunca se escriben credenciales ni claves en el código.
"""

import os
from decimal import Decimal
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# ---------------------------------------------------------------------------
# Seguridad
# ---------------------------------------------------------------------------
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

# Clave Fernet (32 bytes en base64url) para cifrar datos sensibles en reposo
FERNET_KEY = env("FERNET_KEY", default="")

if not DEBUG and not FERNET_KEY:
    # Falla al arrancar si no hay clave de cifrado en producción: nunca se
    # debe guardar una cédula sin cifrar por "falta de configuración".
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured("FERNET_KEY es obligatoria cuando DEBUG=False.")

if FERNET_KEY:
    from cryptography.fernet import Fernet as _Fernet
    from django.core.exceptions import ImproperlyConfigured as _ImproperlyConfigured

    try:
        _Fernet(FERNET_KEY.encode("ascii"))
    except Exception as exc:
        raise _ImproperlyConfigured(
            "FERNET_KEY no es una clave Fernet válida (32 bytes en base64url)."
        ) from exc

# ---------------------------------------------------------------------------
# Aplicaciones
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # Apps del proyecto
    "apps.common",
    "apps.accounts",
    "apps.catalog",
    "apps.orders",
    "apps.payments",
    "apps.addresses",
    "apps.notifications",
    "apps.reviews",
    "apps.promotions",
    "apps.audit",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Base de datos (PostgreSQL)
# ---------------------------------------------------------------------------
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("CONN_MAX_AGE", default=60)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Usuarios y autenticación
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internacionalización / Estáticos / Media
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Almacenamiento PRIVADO: fotos de cédula y otros documentos sensibles.
# Vive fuera de MEDIA_ROOT y NUNCA se sirve estáticamente; se entrega a través
# de una vista protegida (solo el administrador revisor).
PRIVATE_MEDIA_ROOT = env("PRIVATE_MEDIA_ROOT", default=str(BASE_DIR / "media_privado"))

# ---------------------------------------------------------------------------
# CORS (whitelist explícita; nunca "*" en producción)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.DefaultPagination",
    "PAGE_SIZE": env.int("PAGE_SIZE", default=20),
    # Throttling global por defecto. NOTA: ScopedRateThrottle como clase por
    # defecto NO hace nada (los endpoints sin throttle_scope pasan siempre),
    # por eso el global es Anon/UserRateThrottle y el por-scope se declara
    # vista a vista (login, register, verificacion).
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("THROTTLE_ANON", default="60/min"),
        "user": env("THROTTLE_USER", default="300/min"),
        "login": env("THROTTLE_LOGIN", default="10/min"),
        "register": env("THROTTLE_REGISTER", default="10/min"),
        "verificacion": env("THROTTLE_VERIFICACION", default="20/min"),
        "pagos": env("THROTTLE_PAGOS", default="60/min"),
    },
    "EXCEPTION_HANDLER": "apps.common.exceptions.api_exception_handler",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

# ---------------------------------------------------------------------------
# SimpleJWT: access corto, refresh con rotación y blacklist
# ---------------------------------------------------------------------------
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("SECRET_KEY"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# ---------------------------------------------------------------------------
# drf-spectacular (OpenAPI / Swagger)
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "RioMarket API",
    "DESCRIPTION": (
        "Backend del marketplace local de Riohacha. "
        "Marketplace de vendedores informales: catálogo, pedidos, pagos, "
        "verificación de identidad, reseñas y monetización."
    ),
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
    "SWAGGER_UI_SETTINGS": {"deepLinking": True, "persistAuthorization": True},
    "COMPONENT_SPLIT_REQUEST": True,
}

# ---------------------------------------------------------------------------
# Caché compartida entre procesos (Redis en producción; locmem en dev/tests)
# ---------------------------------------------------------------------------
# CACHES se define en settings/prod.py (RedisCache con REDIS_URL).
# Ver config/settings/dev.py y test.py para los entornos locales.

# ---------------------------------------------------------------------------
# Validación estricta de archivos subidos
# ---------------------------------------------------------------------------
# Tamaño máximo de imagen (bytes): 2 MB
MAX_IMAGE_SIZE = env.int("MAX_IMAGE_SIZE", default=2 * 1024 * 1024)
ALLOWED_IMAGE_CONTENT_TYPES = env.list(
    "ALLOWED_IMAGE_CONTENT_TYPES", default=["image/jpeg", "image/png", "image/webp"]
)

# ---------------------------------------------------------------------------
# Logging: nunca imprimir contraseñas ni tokens
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "{levelname} {asctime} {module} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
    "loggers": {
        "django": {"level": "INFO", "propagate": True},
        "apps": {"level": "DEBUG" if DEBUG else "INFO", "propagate": True},
    },
}

# ---------------------------------------------------------------------------
# Pagos (Fase 4)
# ---------------------------------------------------------------------------
# Montos como Decimal (nunca float: 0.1+0.2 != 0.3). Se leen como texto.
DOMICILIO_TARIFA_BASE = Decimal(env("DOMICILIO_TARIFA_BASE", default="0.00"))
PLATFORM_COMMISSION_PERCENTAGE = Decimal(env("PLATFORM_COMMISSION_PERCENTAGE", default="0.00"))
# La pasarela sandbox (simular pagos) SOLO se permite en desarrollo/tests.
PAYMENTS_SANDBOX_ENABLED = env.bool("PAYMENTS_SANDBOX_ENABLED", default=DEBUG)
# Secreto para verificar la firma de los webhooks de la pasarela real.
PAYMENTS_WEBHOOK_SECRET = env("PAYMENTS_WEBHOOK_SECRET", default="")

# ---------------------------------------------------------------------------
# Notificaciones (Fase 5)
# ---------------------------------------------------------------------------
# El email es opcional: por defecto solo se crean notificaciones in-app.
NOTIFICATIONS_EMAIL_ENABLED = env.bool("NOTIFICATIONS_EMAIL_ENABLED", default=False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-responder@riomarket.local")
