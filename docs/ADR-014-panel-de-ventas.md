# ADR-014: panel de ventas

**Estado**: Aceptado

## Contexto

El vendedor solo veía un total de «ingresos aprobados». No sabía qué días vendía más, qué productos
se mueven ni cuántos pedidos tenía por estado. El administrador no tenía el movimiento del mercado
por puesto.

## Decisión

### Qué cuenta como venta

- **Venta** = un `Pago` con `estado = aprobado`. Su día es `fecha_aprobacion` convertido a
  `America/Bogota`. Un pago reembolsado, anulado, rechazado o pendiente no cuenta.
- **Ingreso neto** = `max(subtotal_pedido - comision_plataforma - descuento_aplicado, 0)` por pago.
  Es la misma expresión que `resumen_ingresos` y `Pago.neto_vendedor`; se extrajo a
  `payments.services.expresion_neto_vendedor()` y ambos la usan, de modo que no pueden separarse.
  Una prueba comprueba que la suma de la serie diaria es igual al total de `resumen_ingresos`.
- **Venta bruta** = `subtotal_pedido` (sin domicilio). **Ticket promedio** = bruta / pedidos pagados.
- **Más vendidos**: ítems de pedidos con pago aprobado en el periodo, por `id_producto`, orden por
  unidades, venta bruta y nombre; máximo 5. El nombre sale de `Max("nombre_producto")`: si el
  vendedor renombró el producto, puede aparecer el nombre mayor alfabéticamente (aproximación
  aceptada para no hacer otra consulta). Incluye encargos.
- **Pedidos por estado**: pedidos creados en el periodo; `cancelados_por_plazo` son los cancelados
  con `motivo_cancelacion` distinto de vacío (ADR-012).
- **Periodo**: 7, 30 o 90 días, desde las 00:00 de hoy - (dias - 1) hasta ahora, en hora de Colombia.

### Dónde vive

`apps/payments/estadisticas.py` y `GET /api/payments/ventas/`: pagos depende de pedidos, no al
revés. Es solo lectura y no se cachea (cambia con cada cobro y es barata).

### Visibilidad

El vendedor (rol base, activo) ve solo sus puestos; `?puesto=` ajeno da 403 y el inexistente 404.
El administrador ve todo y recibe `puesto_nombre` en el top. El comprador recibe 403. Un vendedor no
verificado también ve sus ventas (es su historial). El rol se valida con el rol base, igual que
`resumen_ingresos` y `visibles_pagos`; el recurso `vendedor.ventas` solo controla la pantalla.
La tarjeta «Total vendido» del panel del administrador es otra cifra (usa `total_cobrado` e incluye
domicilios); esta vista usa el subtotal y el neto.

### Consultas fijas

4 consultas sin filtro de puesto y 5 con él: totales, serie por día (`TruncDate` con `tzinfo`, vale
en PostgreSQL y SQLite), productos (una fila por producto vendido, se corta a 5 en Python y sus
unidades suman el total) y pedidos por estado (agregados condicionales). Pruebas con
`CaptureQueriesContext` comparan 1 contra 40 pedidos. Con miles de productos vendidos la consulta
de productos traería una fila por producto: aceptable en el alcance actual.

Se añade el índice `pago_estado_aprobacion_idx (estado, fecha_aprobacion)` (`payments.0005`).

### RBAC

Recurso `vendedor.ventas` (`/vendedor/ventas`, icono `BarChart3`, orden 2) para el rol vendedor.
`rbac.0003` lo siembra con `sembrar` (idempotente, no pisa lo que el administrador editó) y corre
un lugar el orden de los recursos del vendedor siguientes solo si siguen en su valor por defecto.

### Interfaz

Gráficos propios, sin librerías: barras por día en SVG (`preserveAspectRatio="none"`, etiquetas en
HTML para que no se deformen), lista de barras horizontales en HTML y chips de estado. Se descartó
Recharts o Chart.js por el peso del bundle y porque su aspecto no encaja con el sistema de diseño.
Accesibilidad: `<figure>` con `<figcaption>` que resume el periodo, `role="img"` con
`aria-labelledby`, `<title>` en cada barra y un interruptor Gráfico/Tabla con la misma información
en una tabla. Hoy se marca con borde amarillo y la etiqueta «Hoy». Sin ventas, un estado vacío
reemplaza al gráfico plano.

## Consecuencias

- Una sola definición de neto en el sistema.
- El día de corte depende de la zona fija de Colombia, no de la del servidor.
- Los pagos aprobados antes de este cambio cuentan por su `fecha_aprobacion` original.
