# ADR-021: pago contra entrega a domicilio

**Estado**: Aceptado

## Contexto

Un pedido a domicilio exigía el pago **aprobado antes de que el puesto lo aceptara** ([ADR-009](ADR-009-retiro-y-pago-al-recoger.md)).
Sin pasarela real ese pago no existe: en producción solo se podía simular, así que el domicilio no funcionaba de
verdad. Además no es como se compra en Riohacha, donde lo normal es pagar en efectivo cuando llega el pedido.
[ADR-018](ADR-018-reglas-de-dinero-y-cancelacion.md) lo dejó como el mayor pendiente.

## Decisión

El efectivo, que ya funcionaba para el retiro («paga al recoger»), pasa a valer también para el domicilio («paga al
recibir»). No hay estados nuevos: se generaliza el «cobro en mano» (`permissions.cobro_en_mano_pendiente`: pago en
efectivo aún `pendiente` o `procesando`).

1. **Crear el pedido.** El checkout registra el pago en efectivo en retiro y en domicilio. El comprador ve «Pagas en
   efectivo cuando te entreguen el pedido: ten listo el total, envío incluido».
2. **Confirmar.** Un pedido con efectivo pendiente se puede confirmar sin cobro previo, sea retiro o domicilio. Cualquier
   otro método sigue exigiendo el pago aprobado.
3. **Entregar y cobrar.** El vendedor del puesto (o el administrador) entrega y, en la misma transacción, el cobro queda
   aprobado: el botón dice «Entregar y cobrar». El comprador **no** cierra su propio efectivo (se le oculta «Ya recibí»).
   Un domicilio **ya pagado** se comporta como siempre: lo cierra el comprador y el vendedor no puede.
4. **El cliente no recibe.** Mientras el efectivo sigue sin cobrar, el vendedor (o el administrador) puede **cancelar un
   pedido «en camino»** (el único caso en que se puede): el stock vuelve y el pago se anula, sin dinero que devolver. Un
   domicilio ya pagado no se cancela en camino (hay dinero del cliente de por medio); el comprador sigue pudiendo
   «reportar que no le llegó». El comprador sigue cancelando solo mientras esté `pendiente` (ADR-018).
5. **El dinero.** Igual que el efectivo del retiro: la comisión sale de `subtotal − cupón`, la tarifa de domicilio es del
   puesto, y al cobrarse suma a la cuenta de comisión del vendedor ([ADR-019](ADR-019-comision-del-efectivo.md)), con la
   política de atraso de [ADR-020](ADR-020-politica-de-atraso.md).

Dónde vive: `orders/permissions.py` (relación `VENDEDOR_DEL_PUESTO_QUE_COBRA_EN_MANO`), `orders/services.py` (tabla de
transiciones, `_validar_transicion`, `_exigir_pago_para_confirmar`, `_aplicar_transicion`) y el frontend (checkout,
avisos y botones, todos guiados por `acciones_permitidas`). Sin migraciones.

## Qué no hace (a propósito)

- **No hay pasarela de pago real.** Pagar por adelantado a domicilio (Nequi, tarjeta) sigue disponible por la API, pero
  solo en modo de prueba; el checkout ya no lo ofrece, porque no mueve dinero.
- **No verifica al cliente.** Un pedido falso a una dirección inexistente cuesta al vendedor un viaje perdido. Lo
  amortigua poder cancelar en camino sin penalización, y que el vendedor puede rechazar el pedido mientras está
  pendiente; un historial de pedidos no recibidos por comprador sería una mejora posterior.
- **No agrega plazos al domicilio.** El barrido de pedidos vencidos ([ADR-012](ADR-012-apartar-con-plazo.md)) sigue siendo
  solo de retiros.
- **No hay repartidor propio**: reparte el puesto, como antes.

## Consecuencias

- El domicilio funciona de verdad en producción, con la forma de pago que la gente ya usa.
- La deuda de comisión de los vendedores crece también con los domicilios, no solo con los retiros.
- Se puede añadir una pasarela real después sin tocar esto: el efectivo y el pago aprobado coexisten como métodos.
