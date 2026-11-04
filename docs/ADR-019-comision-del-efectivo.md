# ADR-019: la comisión del efectivo se anota y se cobra

**Estado**: Aceptado

## Contexto

La plataforma gana una comisión (8 %) sobre lo que vende cada puesto ([ADR-003](ADR-003-pagos.md),
[ADR-018](ADR-018-reglas-de-dinero-y-cancelacion.md)). Pero casi todo el dinero pasa de mano en mano: el comprador
paga en efectivo **en el puesto** y el vendedor se queda con todo. El sistema calculaba y sumaba la comisión
(`Pago.comision_plataforma`, el total del panel del administrador), pero **no había forma de cobrarla**: era una cifra
que nunca llegaba a la plataforma, y por eso el hueco de ingresos más grande.

## Decisión

Un libro de cuentas, sin mover dinero y sin automatismos que castiguen:

1. **Qué se debe.** Por cada vendedor, `pendiente = comisión de sus pagos en efectivo aprobados − pagos de comisión
   anotados`. Solo cuenta el **efectivo**: es el dinero que el vendedor tiene en la mano. Los demás métodos son hoy de
   prueba (no hay pasarela real); con una real la plataforma recibiría ese dinero y le debería el neto al vendedor,
   que es otra cuenta y no está construida. Un cobro que se reembolsa deja de generar comisión, así que si ya se había
   pagado queda un **saldo a favor** (un pendiente negativo) en vez de un error.
2. **Cómo se paga.** El vendedor entrega la comisión por fuera del sistema (Nequi, transferencia o en mano) y el
   administrador **anota** cada pago que recibe (`LiquidacionComision`: vendedor, monto, nota, quién lo anotó, cuándo).
   No se puede anotar más de lo que se debe (evita errores de digitación) y dos administradores anotando a la vez no se
   pasan del saldo (el vendedor se bloquea durante la operación). Cada anotación queda en la auditoría y avisa al
   vendedor cuánto le queda.
3. **Quién ve qué.** El administrador de pagos (recurso `admin.pagos`, el que ya gobierna `/admin/pagos`) ve la cuenta
   de todos y anota; cada vendedor ve solo la suya en «Ventas». Comprador y anónimo, nada.
4. **Dónde vive.** `payments/comisiones.py` (reglas), `GET /api/payments/comisiones/`,
   `GET|POST /api/payments/comisiones/liquidaciones/`, una tarjeta en `/admin/pagos` y otra en `/vendedor/ventas`. Tres
   consultas fijas sin importar cuántos vendedores haya. No requiere migrar el RBAC: reutiliza `admin.pagos`.

## Qué no hace (a propósito)

- **No cobra solo**: no hay cargos automáticos ni recordatorios. Es el registro que permite hacer el cobro.
- **No suspende a quien se atrasa.** Es una política (¿cuánta deuda? ¿cuántos días?) que debe fijar el dueño del
  negocio; con este libro es fácil de añadir después (una condición sobre `comision_pendiente`).
- **No fija la periodicidad.** Se sugiere liquidar cada semana, pero el sistema no lo impone.
- **No es contabilidad**: no concilia con Nequi ni con el banco. El administrador es quien confirma que recibió el
  dinero.

## Consecuencias

- Por primera vez la comisión del efectivo se puede **ver, cobrar y comprobar**: el total «por cobrar» sale de datos,
  no de una estimación.
- Una migración nueva (`payments.0006_liquidacion_comision`) crea la tabla; no toca datos existentes.
- Las anotaciones no se editan ni se borran (corregir un error requiere una decisión de contabilidad); el modelo ya
  impide montos no positivos con una restricción de base de datos.
