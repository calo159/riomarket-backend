"""Entorno de producción: exige variables de entorno y activa seguridad."""

from decimal import Decimal

from .base import *

DEBUG = False

# La demo cobra domicilio y comisión como el resto del proyecto. Se pueden
# sobreescribir por entorno sin tocar código (0.00 para desactivarlos).
DOMICILIO_TARIFA_BASE = Decimal(env("DOMICILIO_TARIFA_BASE", default="3000.00"))
PLATFORM_COMMISSION_PERCENTAGE = Decimal(env("PLATFORM_COMMISSION_PERCENTAGE", default="5.00"))

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

import logging

logger = logging.getLogger(__name__)

# Configuración de almacenamiento: S3-compatible (Supabase Storage/R2/AWS) con respaldo local
_s3_bucket_publico = env("STORAGE_S3_BUCKET_PUBLICO", default="") or env(
    "STORAGE_S3_BUCKET", default=""
)
_s3_bucket_privado = env("STORAGE_S3_BUCKET_PRIVADO", default="")
_s3_access_key = env("STORAGE_S3_ACCESS_KEY", default="")
_s3_secret_key = env("STORAGE_S3_SECRET_KEY", default="")
_s3_endpoint = env("STORAGE_S3_ENDPOINT", default="")
_s3_region = env("STORAGE_S3_REGION", default="us-east-1")
_s3_public_base_url = env("STORAGE_PUBLIC_BASE_URL", default="")

_use_s3 = bool(_s3_bucket_publico and _s3_access_key and _s3_secret_key and _s3_endpoint)

if _use_s3:
    AWS_ACCESS_KEY_ID = _s3_access_key
    AWS_SECRET_ACCESS_KEY = _s3_secret_key
    AWS_STORAGE_BUCKET_NAME = _s3_bucket_publico
    AWS_S3_ENDPOINT_URL = _s3_endpoint
    AWS_S3_REGION_NAME = _s3_region
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    if _s3_public_base_url:
        AWS_S3_CUSTOM_DOMAIN = _s3_public_base_url.replace("https://", "").replace("http://", "")
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
    else:
        MEDIA_URL = f"{_s3_endpoint}/{_s3_bucket_publico}/"

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "bucket_name": _s3_bucket_publico,
                "default_acl": None,
                "querystring_auth": False,
                "file_overwrite": False,
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
    logger.info("Almacenamiento de medios configurado con S3-compatible (bucket público).")
else:
    logger.warning(
        "medios efímeros: sin variables S3; se usará sistema de archivos local "
        "(se perderán en redeploy)"
    )
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
