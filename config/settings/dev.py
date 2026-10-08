"""Entorno de desarrollo local."""

from .base import *

DEBUG = True

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Sin Redis en local, las tareas Celery corren en modo síncrono si se pide
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_ALWAYS_EAGER", default=True)
CELERY_TASK_EAGER_PROPAGATES = True

# Plantillas de correo visibles en consola durante el desarrollo
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
