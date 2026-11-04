# Lógica de negocio de RioMarket

Cómo funciona el marketplace de punta a punta, tal como está en el código. Cada regla remite al ADR que la
decidió. Las partes que **no** existen o que dependen de una decisión del dueño están al final.

## Qué es

Un marketplace para los puestos del mercado de Riohacha. Un comprador arma un pedido de **un solo puesto**, lo
recoge o se lo llevan, y paga en efectivo o en modo de prueba. La plataforma gana una **comisión** sobre lo que
vende cada puesto.

## Quién hace qué

| Rol | Puede |
| --- | --- |
| **Comprador** | Buscar, armar el carrito, pedir (retiro o domicilio), pagar, cancelar mientras esté pendiente, confirmar que recibió, reseñar un puesto donde compró |
| **Vendedor** | Verificarse, publicar puestos y productos, aceptar y preparar pedidos, entregar y cobrar en efectivo (retiro), crear cupones, responder reseñas, ver sus ventas |
| **Administrador** | Verificar vendedores, moderar puestos, productos y reseñas, atender pedidos y pagos, gestionar usuarios, roles y recursos, ver la auditoría |

Los permisos finos no están fijos en el código: son **recursos** que los roles otorgan y el administrador edita (RBAC).
El menú de cada persona sale de ahí, y el servidor es quien decide (el frontend solo pregunta).

## 1. Un vendedor se verifica antes de vender

1. Se registra como vendedor: nace una solicitud de verificación en estado `pendiente`.
2. Sube su cédula y la foto del documento. La cédula se **cifra** y se guarda su huella: la misma cédula no sirve
   para dos cuentas. La foto va a un almacén privado.
3. Un administrador la **aprueba o rechaza** (con motivo). Solo con la verificación aprobada puede publicar y operar
   pedidos (sí puede cancelar). Si se le suspende la cuenta, sus puestos se suspenden.

## 2. El catálogo

- Un **puesto** tiene dueño, ubicación, si ofrece domicilio (exige coordenadas) y su **plazo de retiro** (24 h por
  defecto, entre 2 y 72). Estados: activo, inactivo, suspendido.
- Un **producto** pertenece a un puesto, tiene categoría, precio, unidad de medida y estado (activo, inactivo,
  bloqueado). Se vende de dos formas ([ADR-013](ADR-013-productos-por-encargo.md)):
  - **Con stock:** tiene existencias; cada pedido las descuenta.
  - **Por encargo:** no usa stock; el cliente elige una fecha, el puesto necesita unas horas de preparación y puede
    pedir detalles («qué debe decir la torta»).
- El público ve solo productos **activos de puestos activos**. El dueño ve los suyos aunque estén inactivos.
- La **reputación** de un puesto es el promedio de sus reseñas visibles ([ADR-005](ADR-005-reputacion-resenas.md)).

## 3. Hacer un pedido

El pedido pertenece a **un puesto** (el carrito no mezcla puestos). Al crearlo, en una sola transacción:

1. Se valida que cada producto esté activo y sea de ese puesto, y que las cantidades sean enteras ≥ 1.
2. Se **bloquean** los productos (en orden, para evitar bloqueos cruzados) y se **descuenta el stock**; si alcanza.
   Los encargos validan su tope y su fecha (mínimo la preparación, máximo 60 días).
3. Se **congelan** los precios y los nombres en cada línea: cambiar el producto después no altera el pedido.
4. Se calcula el total (ver «El dinero») y se aplica un **cupón** si lo hay.
5. Si es retiro, se le pone un **plazo** (ver «Plazos»).

**Retiro** (por defecto) o **domicilio** (solo si el puesto lo ofrece y se indica la dirección).

## 4. El ciclo de un pedido

```
pendiente → confirmado → en preparación → ┬ en camino → entregado      (domicilio)
                                          └ listo para recoger → entregado (retiro)
cualquier estado abierto → cancelado
```

([ADR-009](ADR-009-retiro-y-pago-al-recoger.md) tiene la tabla completa y quién ejecuta cada acción.)

- El **vendedor** confirma, prepara y envía o deja listo. En un **retiro** también entrega y cobra el efectivo.
- En un **domicilio** solo el comprador (o un admin) confirma «ya lo recibí»; si no llegó, reporta «no me ha llegado».
- **Cancelar:** el comprador, mientras esté `pendiente`; después, el puesto o el administrador
  ([ADR-018](ADR-018-reglas-de-dinero-y-cancelacion.md)). Al cancelar se **repone el stock**, se **libera el cupón** y
  el pago se **reembolsa** (si estaba aprobado) o se **anula** (si estaba en curso).
- Cada paso **notifica** a la otra parte y queda en la **auditoría**.

## 5. El dinero

Los montos salen de un solo lugar (`apps/common/pricing.py`), así pedido y pago siempre cuadran
([ADR-003](ADR-003-pagos.md), [ADR-018](ADR-018-reglas-de-dinero-y-cancelacion.md)).

```
total que paga el comprador = subtotal + tarifa de domicilio − cupón
comisión de la plataforma   = % × (subtotal − cupón)          (hoy 8 %; no se le suma al comprador)
neto del vendedor           = subtotal − cupón − comisión + tarifa de domicilio
```

Ejemplo, retiro de $10.000 con cupón de $2.000: el cliente paga $8.000; la comisión es $640; el puesto recibe $7.360.
Con domicilio ($3.000): el cliente paga $11.000; la comisión sigue siendo $640; el puesto recibe $10.360.

- El **cupón** lo asume el vendedor, no la plataforma ([ADR-006](ADR-006-promociones-cupones.md)). Tiene vigencia,
  monto mínimo, tope y límites de uso (total y por usuario); nunca supera el subtotal. Uno global lo crea el admin.
- **Métodos de pago:** efectivo (el vendedor confirma el cobro), y un modo de prueba (sandbox). **No hay pasarela real.**
- **Para confirmar un pedido hace falta un pago aprobado**, con una excepción: un **retiro con efectivo** se puede
  confirmar sin cobro previo, porque se paga al recoger ([ADR-009](ADR-009-retiro-y-pago-al-recoger.md)). Un
  domicilio siempre exige el pago aprobado antes.
- Estados del pago: `pendiente → procesando → aprobado → reembolsado`; también `rechazado` y `anulado`.

## 6. Plazos: nada queda apartado para siempre

Un **retiro** vence ([ADR-012](ADR-012-apartar-con-plazo.md)): si el puesto no lo confirma en 24 h, o el cliente no
recoge a tiempo un pedido con efectivo sin cobrar, el sistema lo **cancela solo**, repone el stock y avisa a ambos
(2 h antes avisa que vence). El puesto puede «dar más tiempo» hasta 2 veces. No hay un proceso en segundo plano
(Render gratis no lo permite): el barrido corre al leer el catálogo o los pedidos, y al arrancar el servicio.

## 7. Reseñas

Solo después de un pedido **entregado** de ese puesto, una reseña por comprador y puesto (1 a 5 y comentario). El
autor la edita, el puesto la responde, y el administrador puede ocultarla (sale de la reputación sin borrarse).

## 8. La comisión del efectivo

El efectivo se cobra en el puesto, así que el vendedor se queda con todo y **le debe a RioMarket su comisión**
([ADR-019](ADR-019-comision-del-efectivo.md)). Por cada vendedor: `lo que debe = comisión de sus cobros en efectivo −
lo que ya pagó`. El vendedor entrega la comisión (Nequi, transferencia o en mano) y el administrador **anota** cada
pago en `/admin/pagos`; el vendedor ve su saldo en «Ventas». No hay cobros automáticos.

## 9. El panel de ventas

Una **venta** es un pago aprobado. El vendedor ve ventas brutas (solo mercancía), ingreso neto, cuánto del neto son
envíos, ticket promedio, ventas por día, lo que más vende y sus pedidos por estado
([ADR-014](ADR-014-panel-de-ventas.md)). El administrador ve lo mismo por todo el mercado y la comisión acumulada.

## Lo que el negocio todavía no resuelve

- **Cobrar la comisión del efectivo, solo a medias.** Desde [ADR-019](ADR-019-comision-del-efectivo.md) hay una cuenta
  por vendedor (lo generado, lo pagado y lo que debe) y el administrador anota cada pago que recibe. Pero el cobro
  sigue siendo manual y **no hay política** para quien se atrasa (¿cuánta deuda? ¿cuántos días? ¿se suspende el
  puesto?): eso debe decidirlo el dueño.
- **Pago contra entrega a domicilio.** A domicilio se paga por adelantado y no hay pasarela real, así que en
  producción ese camino solo funciona en modo de prueba. Es la forma natural de pagar en la ciudad.
- **Horarios del puesto.** Son texto libre: se puede pedir fuera de horario (el plazo de 24 h lo amortigua).
- **Un solo repartidor: el puesto.** No hay repartidores propios ni cálculo de tarifa por distancia: la tarifa es una
  sola para todos.
- **Sin pasarela real ni conciliación.** Los pagos distintos al efectivo existen como estados, no como dinero.
