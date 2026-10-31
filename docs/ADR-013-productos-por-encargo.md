# ADR-013: productos por encargo

**Estado**: Aceptado

## Contexto

RioMarket vendía solo productos con **existencias**: el stock se descuenta al crear el pedido
y se repone al cancelar. Los puestos de dulces y repostería (tortas, pudines) no tienen
existencias: hacen el producto **cuando se lo piden**, tardan un tiempo en prepararlo y el
comprador necesita decir qué quiere (sabor, mensaje) y **para cuándo**.

## Decisión

### Modalidad en el producto, copia en el ítem

`Producto.modalidad` es `stock` (por defecto: todo lo que ya existía) o `encargo`. Un encargo
tiene **precio fijo**, `preparacion_horas` (1 a 336), `pide_detalles` y `etiqueta_detalles`
(lo que se le pregunta al comprador, p. ej. «Mensaje para la torta»). No usa stock: al
volverlo por encargo el servicio deja `stock = 0`; al volverlo de stock se borran los tres
campos de encargo. Dos restricciones de base de datos lo respaldan: `producto_modalidad_valida`
y `producto_encargo_requiere_preparacion`.

> El `CHECK` de preparación necesita `preparacion_horas IS NOT NULL` de forma explícita: en
> SQL, un `CHECK` cuyo resultado es «desconocido» (NULL) **pasa**, así que
> `modalidad = 'stock' OR (horas >= 1 AND horas <= 336)` dejaba entrar un encargo con horas
> vacías. Una prueba (`test_constraint_encargo_sin_preparacion_falla_en_bd`) lo comprueba.

`ItemPedido` guarda una **copia** de lo que era el producto al pedir: `modalidad` y `detalles`
(hasta 300 caracteres). El pedido guarda `fecha_solicitada` (para cuándo se quiere).
Mantiene la restricción de **una línea por producto**: los detalles valen para todas sus
unidades; para dos tortas distintas, dos pedidos.

### Regla de stock: qué se repone al cancelar

- Crear un pedido: un ítem `stock` valida y descuenta existencias **como siempre**; un ítem
  `encargo` **no** valida ni descuenta.
- Cancelar (a mano, por el vendedor, el administrador o el barrido de plazos de
  [ADR-012](ADR-012-apartar-con-plazo.md)): `_reponer_stock` suma **solo** las cantidades de los
  ítems con `modalidad = "stock"`. La modalidad que cuenta es la **del ítem**, no la actual del
  producto. Así:
  - nunca se repone stock de un encargo (que nunca se descontó);
  - si el vendedor cambia un producto de stock a encargo con pedidos abiertos, al cancelarlos
    **sí** vuelve el stock que se apartó (el campo `stock` del producto queda con ese número
    aunque ya no se use);
  - si cambia un encargo a stock, cancelar un pedido viejo **no** suma nada.
- Se siguen bloqueando todas las filas de producto del pedido (`select_for_update`), así un cambio
  de modalidad simultáneo no se cuela entre la lectura y la creación.

### Pedidos mixtos

Un pedido puede mezclar productos con stock y por encargo del mismo puesto. Todo se entrega o se
recoge en la fecha pedida.

### Fecha solicitada

Obligatoria si hay al menos un encargo; si no lo hay se guarda `NULL` aunque llegue un valor.
Mínimo: ahora + la **mayor** preparación de los encargos, con 5 minutos de tolerancia (el reloj
del celular y el tiempo de llenar el formulario). Máximo: 60 días. Una fecha sin zona horaria se
toma como hora de Colombia. No se puede cambiar después de crear el pedido. Tope por encargo:
20 unidades. Los detalles son obligatorios si el producto los pide.

### Aceptar = confirmar, y el pago no cambia

No hay estados nuevos: «aceptar el encargo» es el `confirmar` de siempre (pendiente →
confirmado). La regla de pago de [ADR-009](ADR-009-retiro-y-pago-al-recoger.md) queda **sin
cambios**:

- **Retiro con efectivo** (el caso típico: la torta se recoge y se paga en el puesto): el puesto
  acepta antes del pago.
- **Domicilio u otro método**: el pago debe estar aprobado antes de confirmar. Si el puesto no
  puede hacerlo, cancela y `reembolsar_o_anular_por_cancelacion` devuelve el pago.

Se descartó «aceptar antes de pagar» también en domicilio: exigiría un estado o una puerta de
pago nueva. La interfaz lo dice con honestidad: «A domicilio se paga antes de que el puesto
acepte. Si no puede hacerlo, te devolvemos el dinero.»

### Plazos con ADR-012

| Pedido con encargo | `vence_en` |
| --- | --- |
| Retiro `pendiente` | `min(creación + 24 h, fecha_solicitada)`: el puesto acepta antes de la fecha pedida |
| Retiro `listo_para_recoger` con efectivo sin cobrar | `max(ahora, fecha_solicitada) + plazo del puesto`: si lo tiene listo antes, el cliente igual viene en su fecha |
| Domicilio | sin plazo, como siempre |

### Notificaciones

Sin tipos nuevos. Al vendedor: «Recibiste el encargo #N para el {fecha}. Revísalo y confírmalo
si puedes hacerlo.» Al comprador, al aceptar: «{puesto} aceptó tu encargo #N para el {fecha}.»

### Privacidad

Los `detalles` los ve quien ya ve el pedido: el comprador, el vendedor del puesto y quien tenga
`admin.pedidos`. Otro usuario recibe 404 (el queryset ya lo filtra).

### API

`Producto`: `modalidad`, `preparacion_horas`, `pide_detalles`, `etiqueta_detalles` y el filtro
`?modalidad=stock|encargo`. `ItemPedido`: `modalidad` (solo lectura) y `detalles`. `Pedido`:
`fecha_solicitada` (solo al crear) y `tiene_encargo` (calculado sobre `items`, sin consultas
extra). Filtros de `GET /api/orders/pedidos/`: `?producto=<id>` y `?abiertos=true|false`, que
usa el formulario del vendedor para avisar «Este producto tiene N pedidos abiertos. Los cambios
no afectan a esos pedidos.»

## Fuera de alcance (a propósito)

Capacidad diaria del puesto, precio «desde», contrapropuesta de fecha (se habla por WhatsApp y el
puesto cancela si no puede), y dos configuraciones distintas del mismo producto en un pedido.

## Consecuencias

- Las migraciones `catalog.0008_producto_encargo` y `orders.0011_encargos` solo añaden campos con
  valor por defecto y restricciones: los datos existentes quedan como productos y pedidos de
  stock sin tocarlos (probado en `tests/test_migracion_encargos.py`).
- El punto más delicado es `_reponer_stock`: una regresión repondría stock de encargos.
  `test_cancelar_mixto_repone_solo_stock` y `test_cancelar_por_vencimiento_repone_solo_stock` lo
  cubren, junto con la prueba de concurrencia existente.
- Dos pruebas de migraciones anteriores (`tests/test_migracion_vence_en.py`) pasaron a avanzar
  hasta el último estado antes de leer pedidos completos: el modelo de hoy tiene una columna
  (`fecha_solicitada`) que no existe en el esquema de `orders.0009`.
