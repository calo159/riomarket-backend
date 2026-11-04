# ADR-020: quien se atrasa con la comisión recibe un aviso y, si sigue, una pausa

**Estado**: Aceptado

## Contexto

[ADR-019](ADR-019-comision-del-efectivo.md) dejó una cuenta por vendedor (lo que debe de comisión del efectivo) pero
ninguna consecuencia por no pagar: era el hueco que el propio ADR señalaba. Sin consecuencia, la deuda solo crece y
cobrarla depende de que el administrador se acuerde de reclamar.

Se consideraron tres caminos:

1. **Solo avisar.** Barato, pero el aviso no cuesta nada y se ignora.
2. **Suspender de golpe** al pasar un límite. Cobra, pero castiga sin advertir y puede dejar sin ingresos a un puesto
   por un descuido, o cortar pedidos que ya estaban en marcha.
3. **Escalar**: avisar primero y pausar después, solo para lo nuevo. Es la que se adopta.

## Decisión

La política es **por monto**, no por días: Render gratis no permite tareas programadas, y un monto se calcula al
momento con los datos de ADR-019, sin reloj ni cron.

| Estado | Cuándo | Qué pasa |
|---|---|---|
| `al_dia` | debe menos que `COMISION_LIMITE_AVISO` | nada |
| `aviso` | debe `COMISION_LIMITE_AVISO` o más | el vendedor ve un aviso en «Ventas» y recibe una notificación |
| `bloqueado` | debe `COMISION_LIMITE_BLOQUEO` o más | sus puestos **no reciben pedidos nuevos** hasta que pague |

- Los límites son configurables (`COMISION_LIMITE_AVISO`, por defecto $50.000; `COMISION_LIMITE_BLOQUEO`, por defecto
  $150.000). **`0` apaga** la política correspondiente. Alcanzar el límite exacto ya cuenta.
- **Qué se frena.** Solo `crear_pedido`: el comprador que intenta pedir a un puesto en pausa recibe «Este puesto no está
  recibiendo pedidos nuevos por ahora.» (sin mencionar la deuda: es asunto entre el puesto y la plataforma). Los
  pedidos ya creados, aceptados o en camino **siguen su curso**: el cliente no paga por la deuda del vendedor.
- **Cómo se sale.** Al anotar un pago que baja la deuda del límite de bloqueo, el vendedor vuelve a recibir pedidos en
  el acto y se le avisa. La pantalla le dice cuánto pagar para reactivarse (`pagar_para_reactivar = deuda − límite + 1`).
- **Avisos sin ruido.** Se notifica solo al **cruzar** a un estado peor (comparando la deuda de ahora con la de antes de
  ese cobro), no en cada venta mientras sigue en el mismo estado. Hay una notificación también al reactivarse.
- **Por vendedor.** Un vendedor en pausa no afecta a los demás; la pausa es de todos sus puestos.
- **Dónde vive.** `payments/comisiones.py` (`estado_de`, `vendedor_bloqueado`, `avisar_si_empeora`), la comprobación en
  `orders/services.crear_pedido` (ambos están en el nivel 5 de [ADR-017](ADR-017-arquitectura-en-capas.md), que permite
  esa dependencia mutua), y tres campos nuevos más `estado` en `GET /api/payments/comisiones/`. Sin migraciones.
  Con el límite de bloqueo en 0, `vendedor_bloqueado` responde sin consultar la base.

## Qué no hace (a propósito)

- **No mide días de atraso**: una deuda pequeña vieja no dispara nada; una grande y reciente sí. Se eligió por
  simplicidad y porque no exige tareas programadas; si hiciera falta, se añade una condición sobre `ultimo_pago`.
- **No tiene excepciones ni «perdonar» deuda**: el administrador puede resolver un caso especial anotando un pago.
  Un perdón explícito sería otra decisión de contabilidad.
- **No oculta el puesto del catálogo**: el comprador lo ve y el rechazo ocurre al pedir. Avisarle antes sería una mejora
  de la interfaz, no de la regla.
- **No cobra ni mueve dinero**, igual que ADR-019.

## Consecuencias

- La deuda tiene consecuencia visible y gradual; el administrador deja de ser el único que presiona el cobro.
- Es una decisión del negocio con números por defecto razonables, **no definitivos**: el dueño puede ajustarlos en
  Environment sin tocar código. Con `COMISION_LIMITE_BLOQUEO=0` el comportamiento vuelve al de ADR-019.
- El límite de bloqueo debe ser mayor que el de aviso para que el aviso llegue antes; la configuración no lo impone.
