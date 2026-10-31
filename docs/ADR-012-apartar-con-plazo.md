# ADR-012: apartar con plazo y liberación perezosa del stock

**Estado**: Aceptado

## Contexto

Un pedido de **retiro** con pago al recoger ([ADR-009](ADR-009-retiro-y-pago-al-recoger.md))
aparta el producto: el stock se descuenta al crear el pedido. Si nadie confirma o
nadie recoge el pedido, el stock quedaba apartado sin límite y el producto
desaparecía de la venta.

Render gratis no tiene cron ni procesos en segundo plano, así que no hay quien
«despierte» al sistema a una hora fija.

## Decisión

Un pedido de retiro **vence**: si pasa su plazo sin confirmarse o sin recogerse, el
sistema lo cancela, repone el stock, libera el cupón y anula el pago, y avisa a las
dos partes. Un pedido que vence se cancela con las mismas funciones que una
cancelación a mano (`_reponer_stock`, `_liberar_cupon`, `_reembolsar_o_anular_pago`),
con `motivo_cancelacion` y la auditoría a nombre del **Sistema**.

### Qué pedidos vencen y cuáles no

| Tipo | Estado | Pago | ¿Vence? | `vence_en` |
| --- | --- | --- | --- | --- |
| Retiro | `pendiente` | sin pago, o cualquiera que no esté `aprobado` | Sí (el puesto debe confirmar) | creación + `PEDIDOS_PLAZO_CONFIRMACION_HORAS` (24 h) |
| Retiro | `confirmado`, `en_preparacion` | cualquiera | No (el puesto ya aceptó; la demora es suya) | vacío |
| Retiro | `listo_para_recoger` | efectivo `pendiente` o `procesando` | Sí (el cliente debe recoger) | momento de pasar a listo + `Puesto.plazo_retiro_horas` (24 h, entre 2 y 72) |
| Retiro | `listo_para_recoger` | `aprobado`, u otro método | No (cancelar obligaría a reembolsar; lo gestiona el vendedor) | vacío |
| Domicilio | cualquiera | cualquiera | **No** (no hay «recoger»; fuera de alcance) | vacío |
| Cualquiera | `entregado`, `cancelado` | — | No | vacío |

El plazo se fija al crear el retiro y al pasar a «listo para recoger». Un pago que
pasa a `aprobado` (efectivo cobrado en mano, sandbox o webhook) le quita el plazo.
El checkout registra el pago en una segunda llamada, así que la condición de pago se
**vuelve a evaluar al barrer, bajo bloqueo**.

Cambiar `plazo_retiro_horas` no recalcula los pedidos que ya tienen plazo.

### Dar más tiempo

El vendedor del puesto (o un administrador) puede dar más tiempo hasta **2 veces** por
pedido: suma un plazo completo a `max(ahora, vence_en)`, reinicia el aviso y avisa al
comprador. El comprador no puede. La acción aparece en `acciones_permitidas` como
`extender-plazo` solo mientras sea posible (el límite también es un `CHECK` de la base).

### Mecanismo

1. **Servicio idempotente** `orders.vencimientos.cancelar_vencidos(ahora, limite)`.
   - Una sola consulta lista los candidatos (`vence_en <= ahora`, retiro, pendiente o
     listo). Con nada vencido cuesta **1 consulta**.
   - Cada pedido se procesa en **su propia transacción**: se bloquea con
     `select_for_update(skip_locked=True)`, se **revalidan** plazo, estado y pago
     (también bajo bloqueo) y solo entonces se cancela. Si ya no aplica (pagado,
     entregado, plazo ampliado) no se toca; si el plazo quedó huérfano, se limpia.
   - Un pedido que otra petición tiene bloqueado (p. ej. «Entregar y cobrar») se
     **salta** y se cuenta como omitido; el siguiente barrido lo revisa.
   - Orden de bloqueos en todo el sistema: **pedido → pago**. `payments._aplicar_estado`
     bloquea primero el pedido cuando aprueba un pago, para no esperarse en círculo con
     el barrido.
   - Tope por ejecución (`PEDIDOS_BARRIDO_LIMITE`, 25 en lectura) y un fallo en un
     pedido se registra y **no detiene** al resto.
   - Avisos y auditoría salen **fuera** de la transacción del pedido y nunca la
     deshacen.
2. **Barrido perezoso**: `LiberarApartadosMiddleware` llama a `barrer_si_toca()` en las
   lecturas (`GET`/`HEAD`) de `/api/catalog/productos`, `/api/catalog/puestos`,
   `/api/orders/pedidos` y `/api/payments/pagos`, **antes** de la vista, de modo que la
   respuesta ya muestra el stock liberado. Un candado de caché (`cache.add`, 60 s) lo
   limita a una vez por minuto por proceso. Con 0 consultas cuando el candado está
   ocupado. Con LocMem (sin Redis) cada worker tiene su candado: con 2 workers puede
   correr hasta 2 veces por minuto, lo cual es correcto porque el barrido es idempotente.
   En las pruebas está apagado (`PEDIDOS_LIBERAR_EN_LECTURA=False`) para no alterar las
   pruebas de número de consultas; se prueba aparte activándolo.
3. **Al arrancar**: `scripts/render-start.sh` ejecuta
   `python manage.py cancelar_pedidos_vencidos --limite 100 || true`. Render gratis
   reinicia a menudo, así que cada arranque libera lo vencido. No alarga el arranque (tope
   y `|| true`). El comando tiene `--dry-run` y `--limite`, y no usa el candado.
4. **Avisos «vence pronto»** (2 h antes, una sola vez): al comprador si espera recoger,
   al vendedor si debe confirmar.

### Auditoría y avisos

`audit.registrar(usuario=None, accion="vencimiento", entidad="pedido", ...)`: la pantalla
de auditoría muestra **Sistema** cuando no hay usuario. Dar más tiempo se audita como
`extender_plazo` con la persona que lo hizo. El barrido no usa la notificación genérica
de «cancelado»: `pedido_vencido` explica el motivo; `pedido_por_vencer` es el aviso previo.

## Migraciones

- `catalog.0007_puesto_plazo_retiro_horas`: `plazo_retiro_horas` (24 por defecto) y su
  `CHECK` entre 2 y 72. Añadir una columna con valor por defecto constante no reescribe
  la tabla en PostgreSQL 11 o superior.
- `notifications.0004_tipos_vencimiento`: tipos `pedido_por_vencer` y `pedido_vencido`
  (`choices` y `CHECK`).
- `audit.0002_acciones_vencimiento`: acciones `vencimiento` y `extender_plazo`
  (solo `choices`).
- `orders.0009_pedido_vence_en`: `vence_en`, `aviso_vencimiento_en`, `extensiones_plazo`
  y `motivo_cancelacion`, con `CHECK` (`extensiones_plazo <= 2`, motivo válido) e índice
  parcial sobre `vence_en`.
- `orders.0010_vence_en_de_pedidos_abiertos`: migración de datos **reversible**. Da a los
  retiros que ya estaban abiertos un plazo de **24 h contadas desde el momento de
  migrar** (no desde su creación), para no cancelar nada en masa el día del despliegue.
  Revertirla deja todos los plazos y avisos vacíos.

## Datos demo

`seed_masivo` corre en cada arranque y no recrea pedidos; sin ajustes, el sistema
cancelaría a las 24 h el pedido demo «listo para recoger» (`SM-28`) y los pendientes.
Ahora el seed **renueva** en cada ejecución el plazo de los pedidos demo abiertos (7 días)
y añade `SM-31`, un retiro «listo para recoger» con el plazo **vencido a propósito**:
el comando del arranque lo cancela y la demo muestra un pedido «Se canceló solo».

## Alternativas descartadas

- **Celery, cron o un proceso aparte**: no existen en Render gratis.
- **GitHub Actions programado llamando a un endpoint**: obliga a exponer un endpoint con
  un secreto y a tocar las claves de Render; es una decisión del dueño, no de este paquete.
- **Cancelar al leer el detalle de un pedido** (solo ese pedido): no libera el stock de los
  demás ni se ve en el catálogo.
- Para producción real: un cron de Render de pago o `pg_cron` de Supabase que ejecute
  `cancelar_pedidos_vencidos` (la lógica es la misma y es idempotente).

## Consecuencias

- La precisión es de unos **±1 minuto con tráfico**. Sin tráfico, un pedido vencido sigue
  apartado hasta la siguiente lectura o hasta el próximo arranque del servicio.
- La lectura que dispara el barrido suma la latencia de hasta 25 cancelaciones.
- **Carrera aceptada**: si el vendedor abre un pedido justo al vencer, la lectura puede
  dispararlo y cancelarlo. Mitigaciones: el aviso 2 h antes, el botón «Dar más tiempo» y el
  mensaje claro si intenta entregar uno que el sistema ya canceló («Este pedido se canceló
  solo porque venció su plazo. Pídele al cliente que haga uno nuevo.»). El pago de ese
  pedido queda `anulado`, y no se puede cobrar después.
- Un retiro `pendiente` con un pago de pasarela en curso (`procesando`) que nunca se
  aprueba también se cancela al vencer su plazo de confirmación. Si el pago se aprobara
  después, la transición `anulado → aprobado` no es válida y el evento se rechaza; hoy la
  pasarela es solo sandbox, pero con una pasarela real habría que reconciliar ese caso.
- Un cliente que crea el pago justo en el instante en que el pedido vence podría dejar un
  pago `pendiente` colgado de un pedido cancelado; es una ventana de milisegundos al cumplirse
  las 24 h, sin pérdida de venta.
- Ajustes (todos con valor por defecto, sin tocar las variables de Render):
  `PEDIDOS_PLAZO_CONFIRMACION_HORAS` (24), `PEDIDOS_AVISO_ANTES_HORAS` (2),
  `PEDIDOS_LIBERAR_EN_LECTURA` (`True`), `PEDIDOS_BARRIDO_CADA_SEGUNDOS` (60) y
  `PEDIDOS_BARRIDO_LIMITE` (25).
- Con PostgreSQL real, `skip_locked` hace que el barrido nunca espere a una petición que
  ya tiene el pedido; con SQLite (desarrollo y pruebas locales) los bloqueos de fila no
  existen y el barrido se apoya en la revalidación del estado.
