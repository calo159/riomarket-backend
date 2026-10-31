"""Liberación perezosa de los pedidos vencidos (ADR-012).

Render gratis no tiene cron ni procesos en segundo plano, así que el barrido corre como
mucho una vez por minuto por proceso cuando alguien LEE el catálogo o los pedidos. Va antes
de la vista para que la respuesta ya muestre el stock liberado. Nunca rompe la lectura.
"""

import logging

from apps.orders import vencimientos

logger = logging.getLogger(__name__)

# Solo lecturas de estas rutas disparan el barrido.
RUTAS_QUE_BARREN = (
    "/api/catalog/productos",
    "/api/catalog/puestos",
    "/api/orders/pedidos",
    "/api/payments/pagos",
)


class LiberarApartadosMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ("GET", "HEAD") and request.path.startswith(RUTAS_QUE_BARREN):
            try:
                vencimientos.barrer_si_toca()
            except Exception:  # pragma: no cover - barrer_si_toca ya captura; doble red
                logger.exception("Falló la liberación de pedidos vencidos")
        return self.get_response(request)
