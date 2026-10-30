# ADR-009: retiro en el puesto y pago al recoger

**Estado**: Aceptado

## Contexto

Un pedido con retiro en el puesto pasaba por el estado «en camino» aunque nadie lo
llevara, y el vendedor no podía confirmarlo hasta que el pago estuviera aprobado:
no existía «aparta y paga al recoger». Además, solo el comprador (o un
administrador) podía marcarlo como entregado, aunque en persona lo natural es que
el vendedor entregue y cobre.

## Decisión

1. Las transiciones dependen del tipo de entrega
   (`orders.services.transiciones_de(pedido)` / `TRANSICIONES_POR_TIPO`).
   Nuevo estado `listo_para_recoger`, solo para retiro.
2. El vendedor del puesto puede marcar «entregado» un pedido de **retiro**; en
   domicilio sigue siendo solo el comprador (o el administrador).
3. Un retiro con pago en **efectivo** pendiente o procesando se puede confirmar
   sin pago aprobado. Cualquier otro método, y todo domicilio, exige pago aprobado.
4. Al entregar un retiro en efectivo, el cobro se confirma en la misma
   transacción con `payments.confirmar_efectivo`. El comprador no puede aprobar su
   propio efectivo.
5. «No me ha llegado» solo existe para domicilio en camino.

### Transiciones por tipo de entrega

| Estado actual | Domicilio | Retiro |
| --- | --- | --- |
| `pendiente` | `confirmado`, `cancelado` | `confirmado`, `cancelado` |
| `confirmado` | `en_preparacion`, `cancelado` | `en_preparacion`, `cancelado` |
| `en_preparacion` | `en_camino`, `cancelado` | `listo_para_recoger`, `cancelado` |
| `en_camino` | `entregado` | — (no alcanzable) |
| `listo_para_recoger` | — (no alcanzable) | `entregado`, `cancelado` |
| `entregado`, `cancelado` | — | — |

### Quién ejecuta cada acción

| Acción (endpoint) | Comprador | Vendedor del puesto (verificado) | Administrador |
| --- | --- | --- | --- |
| `listo-para-recoger` | No | Sí (retiro) | Sí |
| `entregar` en domicilio | Sí | No | Sí |
| `entregar` en retiro | Sí (salvo efectivo sin cobrar) | Sí (cobra el efectivo) | Sí (cobra el efectivo) |
| `no-recibido` | Sí (solo domicilio en camino) | No | Sí (solo domicilio en camino) |

`acciones_permitidas` es la fuente de verdad del frontend: para el comprador no
incluye `entregar` mientras haya un efectivo de retiro por cobrar; para el vendedor
incluye `entregar` junto a `confirmar-pago` (el botón «Entregar y cobrar»).

### Regla de pago

| Pedido | Pago | ¿Se puede confirmar? |
| --- | --- | --- |
| Retiro | efectivo `pendiente`/`procesando` | Sí |
| Retiro | efectivo `aprobado` | Sí |
| Retiro | otro método `pendiente`/`procesando` | No |
| Retiro | sin pago registrado | No |
| Domicilio | cualquiera que no esté `aprobado` | No (regla de siempre) |

Cancelar un retiro (también desde `listo_para_recoger`) sigue devolviendo el
stock y anulando (pendiente) o reembolsando (aprobado) el pago.

## Migraciones

- `orders.0007_estado_listo_para_recoger`: `choices`, `CheckConstraint`
  `pedido_estado_valido` y `estado` de 15 a 20 caracteres (`listo_para_recoger`
  mide 18).
- `orders.0008_retiros_en_camino_a_listo_para_recoger`: migración de datos
  reversible. Convierte los retiros en `en_camino` en `listo_para_recoger`; al
  revertir, los retiros `listo_para_recoger` vuelven a `en_camino`. Los
  domicilios no se tocan. La auditoría y las notificaciones antiguas conservan su
  texto (reflejan el momento en que ocurrieron).
- `notifications.0003_estado_listo_para_recoger`: nuevo tipo
  `pedido_listo_para_recoger` («Tu pedido #N está listo para recoger en {puesto}»).

## Consecuencias

- El mismo vendedor que prepara el pedido puede cerrar la venta en el puesto,
  sin depender de que el comprador abra la app.
- El checkout con retiro crea automáticamente el pago en efectivo; si esa segunda
  llamada falla, el pedido queda igual y el detalle sigue ofreciendo «Pagar pedido».
- Un retiro pagado con otro método se entrega sin cobro adicional.
- La comisión y el neto del vendedor se calculan igual que con
  `confirmar_efectivo`, porque se usa el mismo servicio.
