"""Abre la caché de recursos RBAC por petición (ver ``acceso.cache_por_peticion``)."""

from apps.rbac.acceso import cache_por_peticion


class CacheRecursosMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with cache_por_peticion():
            return self.get_response(request)
