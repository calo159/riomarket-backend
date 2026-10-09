# ADR-003: Pagos — montos, comisión y pasarela

**Estado**: Aceptado (Fase 4)

## Contexto

El pedido fija montos al crearse (`subtotal`, `tarifa_domicilio`, `total`) y el
pago vuelve a calcularlos. Si cada capa usa su propia fórmula, el invariante
`Pago.total_cobrado == Pedido.total` se rompe (era el caso antes: pedidos
asumían tarifa `0.00` y pagos la leían de `settings`).

## Decisiones

1. **Fuente única de montos**: `apps/common/pricing.py` (`tarifa_domicilio`,
   `comision_plataforma`, `neto_vendedor`). Pedido y pago llaman a las mismas
   funciones, así que sus números siempre cuadran. Los montos del pago se
   copian del pedido ya congelado, nunca del cliente.

2. **La comisión se descuenta al vendedor**:
   `neto_vendedor = subtotal - comision_plataforma`. El comprador paga
   `subtotal + tarifa_domicilio`; la comisión **no** se le suma. La propiedad
   `Pago.neto_vendedor` expone el cálculo.

3. **No se confirma sin pago aprobado**: la transición de pedido
   `pendiente → confirmado` exige un `Pago` en estado `aprobado`. En efectivo,
   el vendedor del puesto (o un admin) lo aprueba con `confirmar_efectivo`;
   con pasarela, el pago se aprueba al simular (sandbox) o vía webhook.

4. **Máquina de estados explícita** (`payments.services.TRANSICIONES`) con
   `select_for_update` + revalidación dentro de la transacción:

   ```
   pendiente  → procesando | aprobado | rechazado | anulado
   procesando → aprobado | rechazado | anulado
   aprobado   → reembolsado
   rechazado  → anulado
   reembolsado, anulado → (final)
   ```

   Todo cambio de estado pasa por `_aplicar_estado`, que registra el evento en
   `datos_sandbox.ultimo_evento` (auditoría) y sella `fecha_aprobacion` /
   `fecha_reembolso`.

5. **Pasarela abstracta + sandbox**: `PasarelaPago` (ABC) define el contrato
   para un proveedor real; `PasarelaSandbox` implementa aprobación simulada y
   webhook firmado. El endpoint `simular` y el método `simulado` **solo**
   funcionan con `PAYMENTS_SANDBOX_ENABLED=True` (por defecto `DEBUG`), de modo
   que la puerta trasera queda cerrada en producción. El webhook verifica una
   firma HMAC-SHA256 sobre el cuerpo crudo (`PAYMENTS_WEBHOOK_SECRET`) con
   `hmac.compare_digest`.

6. **Cancelar reembolsa o anula**: al cancelar un pedido, un pago `aprobado`
   pasa a `reembolsado`; uno `pendiente`/`procesando` pasa a `anulado`. Se
   resuelve dentro de la misma transacción del cambio de estado del pedido.

7. **Visibilidad por rol**: el comprador ve sus montos (subtotal, tarifa,
   total); el vendedor además ve `comision_plataforma` y `neto_vendedor`; el
   admin ve también `datos_sandbox`. Se implementa con serializers separados
   (`PagoSerializer`, `PagoVendedorSerializer`, `PagoAdminSerializer`) y un
   queryset filtrado por pertenencia.

## Consecuencias

- `Pago.id_pedido` es `OneToOneField` con `related_name="pago"` y la BD impone
  `total_cobrado = subtotal_pedido + tarifa_domicilio_aplicada` mediante
  `CheckConstraint`.
- La tarifa de domicilio se calcula en `crear_pedido` y se copia al pago; para
  cambiar de proveedor de pasarela basta registrar otra clase en
  `pasarela._PASARELAS` y apuntar el webhook.
- Los tests verifican montos, transiciones, permisos, gating de sandbox y
  firma de webhook. Ver `apps/payments/tests/test_pagos.py`.
