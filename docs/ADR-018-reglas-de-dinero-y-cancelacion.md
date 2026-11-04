# ADR-018: reglas de dinero y de cancelación

**Estado**: Aceptado

## Contexto

Una revisión de la lógica de negocio (ver [logica-de-negocio.md](logica-de-negocio.md)) encontró tres reglas que
funcionaban «según el código» pero no según el negocio. Las tres quedaron fijadas por pruebas que describían el
comportamiento viejo, así que nadie las había cuestionado.

### 1. La comisión se calculaba sobre lo que el cliente no pagó

El cupón lo asume el vendedor ([ADR-006](ADR-006-promociones-cupones.md)), pero la comisión se calculaba sobre el
**subtotal bruto**. Con una comisión del 8 % y un subtotal de $10.000:

| Cupón | Paga el cliente por la mercancía | Comisión antes | Comisión real sobre lo cobrado | Neto del vendedor antes |
| --- | --- | --- | --- | --- |
| $0 | $10.000 | $800 | 8,0 % | $9.200 |
| $2.000 | $8.000 | $800 | 10,0 % | $7.200 |
| $5.000 | $5.000 | $800 | **16,0 %** | $4.200 |
| $10.000 (100 %) | **$0** | $800 | **cobra por un pedido gratis** | $0 (en realidad −$800) |

Con un cupón del 100 % la plataforma registraba $800 de comisión por un pedido de $0, el resumen del
administrador sumaba ese ingreso inexistente, y el neto del vendedor se «tapaba» en 0 cuando debía −$800.

### 2. La tarifa de domicilio no era de nadie

El comprador paga la tarifa ($3.000), pero el neto del vendedor la excluía. La reparte el puesto (el vendedor
marca «en camino»; no existe un repartidor de la plataforma). Resultado: en un pedido de $10.000 con domicilio la
plataforma retenía $800 de comisión **más** $3.000 de envío, un 38 % del pedido, por un servicio que presta el
puesto.

### 3. El comprador cancelaba sin costo cuando el puesto ya había trabajado

La tabla de transiciones permite cancelar desde `confirmado`, `en_preparacion` y `listo_para_recoger`, y el
comprador tenía el permiso `cancelar` en cualquier estado. Podía cancelar con el producto ya cocinado, o un
encargo (hecho a la medida) ya empezado, y recibía todo el dinero de vuelta. El stock se repone, pero un pan
caliente o una torta con su nombre no vuelven a la venta.

## Decisión

1. **La comisión se calcula sobre lo que se paga por la mercancía**: `subtotal − descuento`. Un cupón que regala
   la mitad no genera comisión por esa mitad; uno del 100 % no genera ninguna. Como la base nunca es mayor que lo
   cobrado, el neto del vendedor ya no puede quedar en negativo (el tope en 0 se conserva para datos anteriores).
2. **La tarifa de domicilio es del puesto que reparte.** `neto = subtotal − descuento − comisión + tarifa_domicilio`.
   La comisión sigue siendo solo sobre la mercancía: pedir domicilio no la encarece. Se controla con
   `DOMICILIO_TARIFA_PARA_VENDEDOR` (por defecto `true`); en `false` la plataforma se queda la tarifa y todo lo demás
   se comporta como antes. El panel de ventas muestra cuánto del ingreso neto son envíos (`envios_incluidos`),
   porque el neto puede superar la «venta bruta», que sigue siendo solo mercancía.
3. **El comprador cancela solo mientras el pedido está `pendiente`** (antes de que el puesto lo acepte). Después,
   cancelan el puesto o el administrador. El comprador ve un aviso que explica por qué ya no puede y qué hacer
   (pedírselo al puesto). La regla vive en `orders.permissions`, de modo que `acciones_permitidas` (que decide qué
   botones muestra el frontend) y el servicio nunca se contradicen. Cancelar desde el puesto repone el stock, libera el
   cupón y reembolsa o anula el pago exactamente igual que antes.

## Consecuencias

- **Pagos ya registrados**: la comisión se guarda en cada pago, así que los anteriores conservan la suya y no se
  recalcula nada. Lo que sí cambia, porque el neto se calcula al consultar, es que el neto histórico de pedidos con
  domicilio ahora incluye su tarifa. Con datos de demostración y pagos de prueba no hay dinero real afectado; con
  una pasarela real habría que decidirlo con contabilidad antes de desplegar.
- **Por qué no una ventana de tiempo para cancelar**: sería más flexible (p. ej. 5 minutos tras aceptar), pero
  añade un reloj que probar y explicar. La regla por estado es verificable y suficiente; se puede refinar después.
- **Comprador que no recoge un pedido listo**: ya no puede cancelarlo; el plazo de [ADR-012](ADR-012-apartar-con-plazo.md)
  lo cancela solo, o el puesto lo hace antes.
- Las pruebas que fijaban las reglas anteriores se reescribieron a las nuevas, y se agregaron pruebas de cada regla
  (comisión con cupón y con cupón del 100 %, interruptor del domicilio, quién cancela en cada estado). Se comprobó que
  fallan si se deshace cada cambio.

## Lo que se vio y no se cambió (decisiones del dueño del negocio)

- **La comisión de los pagos en efectivo no se cobraba a nadie.** *(Resuelto a medias por
  [ADR-019](ADR-019-comision-del-efectivo.md): hay una cuenta por vendedor y el administrador anota cada pago, y
  [ADR-020](ADR-020-politica-de-atraso.md) define qué pasa con quien se atrasa.)*
- **A domicilio se paga por adelantado** y hoy no hay pasarela real, así que en producción ese camino solo funciona
  en modo de prueba. *(Resuelto por [ADR-021](ADR-021-pago-contra-entrega.md): el domicilio se paga en efectivo al
  recibir.)*
- `Usuario.puede_publicar` devuelve `true` para un vendedor sin solicitud de verificación. La aplicación siempre crea
  esa solicitud (al registrarse y al cambiar el rol), así que no es alcanzable desde ella; sí desde el panel de
  Django si alguien asigna el rol a mano.
