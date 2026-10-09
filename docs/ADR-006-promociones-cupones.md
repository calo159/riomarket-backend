# ADR-006: Promociones y cupones de descuento

**Estado**: Aceptado (Fase 6b)

## Contexto

Se necesitaban descuentos por puesto o globales sin romper las fórmulas de
montos que ya viven en un único lugar (pedido/pago). Complicaciones: cupones de
monto fijo o porcentaje, tope de descuento, monto mínimo, límites de uso,
vigencia y, sobre todo, decidir **quién asume el descuento**.

## Decisiones

1. **App `apps/promotions` con `Cupon` y `UsoCupon`**. `Cupon`: `codigo`
   (`unique`, normalizado a mayúsculas en `clean()`), `id_puesto`
   (`SET_NULL`, nulo = global), `tipo_descuento` (porcentaje/monto), `valor`,
   `monto_minimo_pedido`, `tope_descuento`, `usos_totales`,
   `usos_por_usuario`, `fecha_inicio`/`fecha_fin`, `activo`. Invariantes por
   `CheckConstraint` (valor > 0, porcentaje ≤ 100, fechas coherentes, usos
   positivos). `UsoCupon` registra cada consumo con `UniqueConstraint`
   `id_pedido` (un pedido = a lo sumo un cupón).

2. **El descuento lo asume el vendedor**: `total_pedido = subtotal + tarifa −
   descuento` y `neto_vendedor = subtotal − comisión − descuento`. Se decidió
   así para que el marketplace no subsidie las promos. `Pedido` gana
   `id_cupon` (`SET_NULL`, snapshot) y `descuento_cupon`; `Pago` gana
   `descuento_aplicado`. Las `CheckConstraint` de total de `Pedido` y `Pago` se
   reescriben restando el descuento.

3. **Autorización**: el cupón global solo lo crea el admin; el cupón de puesto,
   su vendedor (o el admin). El comprador no ve cupones. La lista se filtra por
   `visibles_cupones` (admin todo, vendedor los de sus puestos, resto nada).

4. **Validación y aplicación** (`services`): `validar_cupon` calcula el
   descuento sin mutar (para el checkout, endpoint
   `POST /api/promotions/cupones/validar/`). `aplicar_cupon` bloquea la fila
   del cupón con `select_for_update` y revalida vigencia, puesto, monto mínimo
   y límites. `crear_pedido` acepta `codigo_cupon` (write_only), aplica el
   cupón dentro del mismo `atomic` que descuenta stock y registra el
   `UsoCupon` tras guardar. El descuento nunca supera el subtotal ni el tope y
   se redondea hacia abajo (`ROUND_DOWN`).

## Consecuencias

- `CuponFactory`/`UsoCuponFactory` para tests; cobertura de services,
  integración pedido/pago y endpoints en
  `apps/promotions/tests/test_cupones.py`.
- Un pago con descuento hace que `neto_vendedor` pueda acercarse a 0; es una
  propiedad calculada, no una columna, y por eso no se le pone `CheckConstraint`.
