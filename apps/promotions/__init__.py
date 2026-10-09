"""Módulo de promociones / cupones de descuento (Fase 6b).

Un cupón pertenece a un puesto específico o es global (``id_puesto`` nulo) y
solo lo crean administradores en ese caso. La validación al aplicar vive en
``apps.promotions.services``; el descuento se descuenta del total del pedido y
lo asume el vendedor (``neto_vendedor = subtotal - comisión - descuento``).
"""
