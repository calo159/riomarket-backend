"""Entorno de desarrollo local."""

from .base import *

DEBUG = True

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Plantillas de correo visibles en consola durante el desarrollo
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
