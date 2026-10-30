# Auditoría general de RioMarket

Rama `mejora/auditoria-general` (la rama `mejora/optimizacion` cerró R-06, R-13, R-16, L-18, F-08 y F-10 a F-20 salvo F-19). Cinco revisiones en paralelo (seguridad, base de datos y rendimiento, frontend, infraestructura, lógica y tests); **cada hallazgo se verificó leyendo el código o con una prueba que falla antes y pasa después**. Los duplicados entre áreas se marcan con `=`.

## Resumen ejecutivo

- Hallazgos únicos: **91** (8 duplicados entre áreas).
- Por severidad: **2** crítico, **12** alto, **44** medio, **33** bajo.
- Por área: Frontend 22, Infraestructura 20, Seguridad 18, Rendimiento/BD 16, Lógica 15.
- Estado: **64** corregido, **19** propuesto, **8** corregido en parte (más 8 duplicados que siguen al hallazgo original).
- Línea base → final: 666 → 801 pruebas de backend, 33 → 73 de frontend; cobertura de backend 92 % (medida antes de la rama `mejora/optimizacion`).

### Top 10 de riesgos

1. **S-01** — `SECRET_KEY`, `FERNET_KEY` y la clave de la base están en el historial público de git. *Rotar es obligatorio.*
2. **S-02** — la clave del superusuario demo es pública y se reaplica en cada arranque de Render mientras `SEED_DEMO=true`.
3. **S-03** — con el sandbox activo, un comprador puede aprobar su propio pago (mitigado a pagos «simulados»).
4. **S-06/I-09** — falta definir `NUM_PROXIES` en Render para que el límite de login use la IP real.
5. **I-04** — las fotos de cédula siguen en disco efímero hasta que configures el bucket privado (el código ya lo soporta).
6. **S-11** — el RBAC por recursos no gobierna cupones, notificaciones ni direcciones (alcance documentado).
7. **L-05** — `puede_publicar` deja pasar a un vendedor sin fila de verificación.
8. **S-15** — enumeración de correos, celulares y cédulas en registro, perfil y cupones.
9. **S-16** — el logout falla con 401 si el access token ya venció.
10. **I-19** — una `FERNET_KEY` inválida se re-deriva en silencio y deja las cédulas indescifrables.

## Hallazgos

### Seguridad

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| S-01 | CRÍTICO | Credenciales reales (`DATABASE_URL`, `SECRET_KEY`, `FERNET_KEY`) en el historial de git; `origin/main` aún versiona `.env` | Propuesto | `baea219` lo desversiona (local, sin push). Hay que **rotar** y reescribir historial si se desea |
| S-02 | CRÍTICO | `SEED_DEMO=true` recrea en cada arranque el superusuario `admin@riomarket.test` con clave pública | Propuesto | Decisión del dueño: `main` quitó `--if-empty` a propósito para refrescar las cuentas demo. Riesgo vigente mientras la demo sea pública |
| S-03 | ALTO | El comprador se autoaprueba cualquier pago con `simular_pago` (sandbox activo en producción) | Corregido en parte | `7c0f750`: solo pagos con método `simulado`. Apagar `PAYMENTS_SANDBOX_ENABLED` queda como decisión |
| S-04 | ALTO | Token de recuperación de contraseña escrito en los logs y sin envío de correo | Corregido | `7c0f750` |
| S-05 | MEDIO | Restablecer contraseña no es atómico, no cierra sesiones y no invalida tokens previos | Corregido | `7c0f750` |
| S-06 | ALTO | Throttling evadible con `X-Forwarded-For` y contador por proceso (sin `NUM_PROXIES`/Redis) | Corregido en parte | Se agregó `NUM_PROXIES` (variable de entorno, sin valor por defecto) y la caché de la BD compartida entre workers. Falta que definas `NUM_PROXIES` en Render según tus proxies |
| S-07 | ALTO | Reposición de stock al cancelar puede duplicarse (sin bloqueo del pedido ni `F()`) | Corregido | `aaa531c` |
| S-08 | MEDIO | El cupón no se repone al cancelar el pedido | Corregido | `aaa531c` |
| S-09 | MEDIO | `save()` completo al editar productos/puestos pisa la moderación y el stock | Corregido | `906b01b` |
| S-10 | MEDIO | Vendedor no verificado/rechazado sigue confirmando pedidos y cobros | Corregido en parte | `15bbd9e`: confirmar/preparar/enviar y cobrar en efectivo. Falta `crear_pedido` y suspender puestos al rechazar |
| S-11 | MEDIO | RBAC por recursos aplicado a medias (pagos, cupones, notificaciones, direcciones siguen por rol) | Propuesto | Alcance documentado en el README (Decisión 14) |
| S-12 | MEDIO | Anti-escalada incompleta: se podían entregar recursos que el actor no tiene y editar roles de sistema | Corregido | `15bbd9e` |
| S-13 | MEDIO | Webhook sin idempotencia, ventana de tiempo ni verificación de monto | Corregido | Monto y ventana de tiempo de 5 minutos validados cuando la pasarela los envía (rama `mejora/pendientes-auditoria`) |
| S-14 | MEDIO | DoS por imágenes con millones de píxeles y formatos no permitidos | Corregido | `bf9364c` |
| S-15 | BAJO | Enumeración de correos/celulares/cédulas en registro, perfil y cupones | Propuesto | Mensajes genéricos o throttle fuerte |
| S-16 | BAJO | Logout falla con 401 si el access token ya venció | Propuesto |  |
| S-17 | BAJO | Cabecera CSRF personalizada compara el origen por prefijo | Corregido | `906b01b` |
| S-18 | BAJO | Foto de cédula sin `Cache-Control`/auditoría de acceso, `puede_publicar` falla abierto, docs de API públicas, etc. | Propuesto | Ver detalle en el informe de seguridad |

### Rendimiento/BD

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| R-01 | ALTO | Cancelar/transicionar un pedido sin bloqueo de fila ni `F()` (stock 14 en vez de 10) | Duplicado | = S-07 |
| R-02 | ALTO | `POST /promotions/cupones/validar/` da 500 en PostgreSQL (`select_for_update` fuera de `atomic`) | Corregido | `aaa531c` |
| R-03 | MEDIO | `crear_pedido` hacía 3 consultas por línea y no limitaba las líneas (302 consultas para un 400) | Corregido | `9a636c7`: 70→47 consultas con 12 líneas; 121→<20 al rechazar 120 |
| R-04 | MEDIO | Cancelar pedido hacía N+1 sobre productos | Corregido | `aaa531c` |
| R-05 | MEDIO | `_invalidar_sesiones` hacía `get_or_create` por token (220 consultas con 50) | Corregido | `7c0f750`: 2 consultas |
| R-06 | MEDIO | `tiene_recurso` consulta la BD en cada llamada, sin caché por petición | Corregido | `184c7d4`: caché por petición (middleware + `ContextVar`), vaciada por señales si el RBAC cambia dentro de la petición; 3 llamadas pasan de 3 consultas a 1 |
| R-07 | MEDIO | Listado de pedidos con `OR` sobre join: escaneo completo | Corregido | `9802e78` |
| R-08 | MEDIO | Casi ningún modelo declara `Meta.indexes` | Corregido en parte | `feb0753`: 6 índices (pedido, producto, pago, notificación, reseña). `1b69dbd`: `Puesto (estado, nombre)` y `Usuario (rol/estado, -fecha_registro)`. `pg_trgm` sigue propuesto |
| R-09 | MEDIO | Filtro de fechas de auditoría con `__date` anulaba el índice | Corregido | `dd31ca3` |
| R-10 | MEDIO | `COUNT` del listado de puestos arrastraba reseñas y la fila del vendedor | Corregido | `9802e78` |
| R-11 | MEDIO | `COUNT` del listado de usuarios hacía join/group by con todos los pedidos | Corregido | `9802e78` |
| R-12 | MEDIO | Listado de roles: dos `Count` sobre dos joins multiplican filas | Corregido | `9802e78` |
| R-13 | BAJO | `reordenar_imagenes` hace un UPDATE por id y no limitaba la lista | Corregido | `bf9364c`: validación y tope; `5a22b54`: un solo `bulk_update` |
| R-14 | BAJO | `IntegrityError` en carreras daba 500 | Corregido | `bf9364c` (ver L-09) |
| R-15 | BAJO | `select_related` sin uso en notificaciones, pedidos, direcciones y pagos | Corregido | `dd31ca3`. Reseñas lo conserva (usa `usuario_nombre`) |
| R-16 | BAJO | `resumen()` hace 15 consultas sin caché | Corregido | `66023dd`: `resumen()` pasa de 14 a 8 consultas (una por tabla) con los mismos valores |
| R-17 | BAJO | Actualizar el perfil dispara la sincronización de roles | Corregido | `906b01b` |

### Lógica

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| L-01 | ALTO | Un cupón no se repone al cancelar | Duplicado | = S-08 |
| L-02 | ALTO | `validar` cupón da 500 en PostgreSQL | Duplicado | = R-02 |
| L-03 | MEDIO | Condición de carrera en las transiciones de pedido | Duplicado | = S-07 |
| L-04 | MEDIO | Vendedor rechazado/pendiente sigue operando pedidos | Duplicado | = S-10 |
| L-05 | MEDIO | `puede_publicar`/`EsVendedorAprobado` dejan pasar si no existe la fila `Vendedor` | Propuesto | Cambiarlo rompe muchos datos/tests existentes; requiere decisión |
| L-06 | MEDIO | Unicidad de cédula/celular evadible con dígitos Unicode | Corregido | `bf9364c` |
| L-07 | MEDIO | Se puede registrar un celular vacío o demasiado corto | Propuesto | Definir la longitud válida |
| L-08 | MEDIO | 500 por parámetros mal formados (filtros de reseñas, imágenes) | Corregido | `bf9364c` |
| L-09 | BAJO | `IntegrityError` no está en el manejador de excepciones | Corregido | `bf9364c` |
| L-10 | MEDIO | Cupones aceptan montos negativos | Corregido | `bf9364c` |
| L-11 | MEDIO | Neto del vendedor negativo con cupón del 100 % | Corregido | El neto del vendedor se acota en 0 (la plataforma absorbe la diferencia) |
| L-12 | BAJO | Redondeo del descuento (`ROUND_DOWN`) inconsistente con `pricing.py` | Propuesto |  |
| L-13 | MEDIO | Calificación fuera de rango y regla «una reseña por pedido» implementada como «por puesto» | Corregido | Se mantiene «una reseña por usuario y puesto» (como documenta la app); rango 1–5 corregido |
| L-14 | MEDIO | Un pago rechazado no se puede reintentar | Corregido | Un pago rechazado se reutiliza y el comprador puede reintentar |
| L-15 | MEDIO | Webhook no idempotente (reintentos dan 400) | Corregido | `7c0f750` |
| L-16 | BAJO | Formato de errores no uniforme (lista en vez de dict por campo) | Propuesto |  |
| L-17 | BAJO | Categorías con padre propio o ciclos | Corregido | `bf9364c` |
| L-18 | BAJO | Direcciones: coordenadas fuera de rango y `DELETE` que se salta el servicio | Corregido | `bf9364c`: rangos; `6310935`: `DELETE` usa `eliminar_direccion` y promueve otra dirección activa si se borra la predeterminada |
| L-19 | MEDIO | Recuperación de contraseña sin correo ni pruebas | Duplicado | = S-04 (se añadieron pruebas) |
| L-20 | BAJO | Producto con precio 0 permitido | Propuesto |  |

### Infraestructura

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| I-01 | CRÍTICO | Credenciales en el historial | Duplicado | = S-01 |
| I-02 | ALTO | Cada arranque en Render re-siembra y resetea la clave del admin | Duplicado | = S-02 |
| I-03 | ALTO | Documentos afirmaban `--if-empty` que el script no usaba | Corregido | `main` documentó el comportamiento real (refresco en cada arranque) |
| I-04 | ALTO | La foto de cédula nunca va a S3 y se pierde en cada redeploy | Corregido en parte | Código listo: bucket S3 privado con `STORAGE_S3_BUCKET_PRIVADO`. Falta configurarlo en Render |
| I-05 | ALTO | El servicio Postgres del CI no se usa (tests en SQLite) | Corregido | `TEST_DATABASE_URL` en `ci.yml`: el CI prueba contra PostgreSQL |
| I-06 | MEDIO | README promete un `.env` versionado; un clon limpio no arranca | Corregido | README actualizado |
| I-07 | MEDIO | Sin `DATABASE_URL`, producción cae en SQLite efímero sin avisar | Propuesto |  |
| I-08 | MEDIO | `index.html` y estáticos se sirven sin CSP ni `X-Frame-Options` | Corregido | `f2391d0` (+ prueba de orden de middleware) |
| I-09 | MEDIO | Límites de peticiones por proceso (sin Redis, 2 workers) | Corregido en parte | La caché en la BD se revirtió: sumaba ~6 consultas a cada petición. Sin `REDIS_URL` vuelve a LocMem (límite por worker); con Redis el límite es compartido |
| I-10 | MEDIO | Versiones instaladas distintas a las fijadas; sin lockfile | Propuesto |  |
| I-11 | MEDIO | `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` abiertos a todo `onrender.com` | Propuesto | Usar el hostname exacto |
| I-12 | MEDIO | `entrega/*.sql|json` obsoletos, con hashes de contraseña | Propuesto | Se conservan por ser entregables del curso; `LEEME_ENTREGA.md` y `docs/README.md` los marcan como históricos (anteriores al RBAC) |
| I-13 | MEDIO | Postman: el paso «Entregar» usaba el token del vendedor | Corregido | `f2391d0` |
| I-14 | BAJO | `README.en.md` desincronizado | Corregido | `README.en.md` reescrito y al día |
| I-15 | BAJO | Cifras de pruebas obsoletas en README/MANTENIMIENTO | Corregido | README.md, README.en.md y MANTENIMIENTO.md al día |
| I-16 | BAJO | Prompts de IA en `docs/` y ADR-008 fuera de lugar | Corregido | Los prompts salen del repo (siguen en tu disco, ignorados); ADR-008 movido a `docs/` y al índice |
| I-17 | BAJO | `requests` falta en `requirements-dev.txt` | Corregido | `f2391d0` |
| I-18 | BAJO | `.env.example` sin `JWT_*` ni `TEST_DATABASE_URL` | Corregido | `f2391d0` |
| I-19 | BAJO | `FERNET_KEY` inválida se re-deriva en silencio | Propuesto |  |
| I-20 | BAJO | Producción acepta una `SECRET_KEY` de ejemplo o corta | Corregido | `f2391d0` |
| I-21 | BAJO | Dockerfiles: `build-essential` en la imagen final, `npm ci || npm install`, etc. | Propuesto |  |
| I-22 | BAJO | Archivos sobrantes (`package-lock.json` en la raíz) | Corregido en parte | `f2391d0` borra el lockfile; el resto propuesto |

### Frontend

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| F-01 | ALTO | «Confirmar cobro en efectivo» y «pagar» se deciden por rol, no por ser el vendedor/comprador de ese pedido | Corregido | `acciones_permitidas` incluye `pagar` y `confirmar-pago` (solo el vendedor de ese pedido o un admin); el frontend las usa |
| F-02 | ALTO | El admin aprueba cédulas sin poder verlas | Corregido | `cbae80a` |
| F-03 | ALTO | Un fallo de `/auth/menu/` se ve como 403 en todas las rutas de panel | Corregido | `a7a0275` |
| F-04 | ALTO | Al reemplazar el carrito se pierde la cantidad elegida | Corregido | `a7a0275` |
| F-05 | MEDIO | Caracteres corruptos (U+FFFD) en `PedidosAdmin.tsx` | Corregido | `a7a0275` |
| F-06 | MEDIO | Reembolsar/anular sin confirmación; botones solo-icono sin nombre accesible | Corregido | `cbae80a` |
| F-07 | MEDIO | El carrito sobrevive al cierre de sesión | Corregido | `a7a0275` |
| F-08 | MEDIO | «Ingresos aprobados» sumado en cliente con tope de 100 | Corregido | `2d47d32` y `55fd8aa`: `GET /payments/pagos/resumen/` suma el neto en la base de datos (sin tope de 100) y respeta la visibilidad por rol |
| F-09 | MEDIO | El efecto de direcciones del checkout pisa lo que el usuario edita | Propuesto |  |
| F-10 | MEDIO | Modal sin trampa de foco | Corregido | Trampa de foco y overlay fuera del teclado en `Modal`; el ARIA de `AccountMenu` y del drawer es F-11 |
| F-11 | MEDIO | ARIA inválido en `AccountMenu` y drawer móvil | Corregido | `5baf87b`: `AccountMenu` sin `role="menu"` (disclosure con `aria-controls`); drawer como `dialog` modal con fondo fuera del teclado y botones con `aria-expanded` |
| F-12 | MEDIO | Claves de consulta inconsistentes (id numérico vs string) | Corregido | `d654963`: `src/lib/queryKeys.ts` centraliza las claves y normaliza los ids a número |
| F-13 | MEDIO | «Hoy» calculado en UTC en cupones | Corregido | `cbae80a` |
| F-14 | BAJO | Formato de calificación y etiquetas de estado duplicados | Corregido | `566b6be`: `formatearCalificacion` y `OPCIONES_FILTRO_PEDIDO` en `lib/format.ts` |
| F-15 | BAJO | Componentes de más de 300 líneas (`PedidoDetalle` 580) | Corregido | `211e721`: `PedidoDetalle` de 573 a 241 líneas, con subcomponentes en `src/pages/pedido/` |
| F-16 | BAJO | Código muerto (`actualizarPedido`, tipos exportados sin uso, `limpiarRefresh` vacío) | Corregido | `3719ab2`: `actualizarPedido`, `limpiarRefresh`, `contarNoLeidas` y tipos sin uso fuera; exportaciones innecesarias quitadas |
| F-17 | BAJO | `as any` en tarjetas y `api-types.ts` desfasado de las imágenes | Corregido | `265b87a`: `api-types.ts` regenerado (`logo`/`portada` de `Puesto`) y sin `as any` |
| F-18 | BAJO | Imágenes sin `width/height`; hero con `loading=lazy` | Corregido | `265b87a`: `width`/`height` en las imágenes; portada del puesto e imagen principal del producto con carga inmediata |
| F-19 | BAJO | Estados de carga/vacío/título inconsistentes | Corregido en parte | Pagos y Verificaciones corregidos en `cbae80a` |
| F-20 | BAJO | `staleTime` y sondeos redundantes | Corregido | `d654963`: sin `staleTime` igual al valor por defecto; la campana usa los badges del menú en lugar de un sondeo propio |
| F-21 | BAJO | Bucle con `?redirect=/login` | Corregido | `64370a0` |
| F-22 | BAJO | e2e con solo 2 pruebas | Propuesto |  |

## Mediciones (antes → después)

| Caso | Antes | Después |
| --- | --- | --- |
| `crear_pedido` por API, 1 línea / 12 líneas | 37 / 70 consultas | 36 / 47 |
| Rechazar un pedido de 120 líneas inventadas | 121 consultas | menos de 20 |
| `invalidar_sesiones` con 10 tokens (suspender/cambiar rol) | ~40 consultas (4 por token) | 2 |
| `COUNT` del listado de usuarios admin | join + group by con `orders_pedido` | sin join |
| `COUNT` del listado público de puestos | `DISTINCT` + `AVG` + join con reseñas | sin join |
| Pedidos por estado ordenados por fecha (SQLite) | `SCAN` + `TEMP B-TREE` | `SEARCH … USING COVERING INDEX pedido_estado_fecha_idx` |
| Productos activos por nombre | `SCAN` + `TEMP B-TREE` | `SEARCH … USING COVERING INDEX producto_estado_nombre_idx` |
| Pagos por estado / notificaciones no leídas | `SCAN` / índice solo por usuario | índice compuesto |
| Tests: listados personales con 2 vs 12 filas | — | consultas constantes (guardia en `tests/test_consultas.py`) |
| Listados de catálogo, reseñas, categorías y pedidos con 2 vs 10 filas | — | consultas constantes (guardia en `tests/test_consultas_listados.py`); no había N+1 |
| `resumen()` del panel de administración | 14 consultas | 8 |
| `tiene_recurso` llamado 3 veces en una petición | 3 consultas | 1 |
| `reordenar_imagenes` con 8 imágenes | 1 `SELECT` + 8 `UPDATE` | 1 `SELECT` + 1 `UPDATE` |
| Chunk `schemas-*.js` (zod, react-hook-form) | 118,14 kB (36,53 kB gzip) | 54,79 kB (19,09 kB gzip) con `zod/mini` |
| Chunk `index-*.js` (librerías + app) | 317,40 kB (104,11 kB gzip) | 52,74 kB de app + `vendor-react` 141,88 kB + `vendor-datos` 86,86 kB + `vendor-router` 39,14 kB (cada deploy solo invalida el de la app) |

## Propuestas pendientes (requieren decisión)

- **Rotar credenciales y limpiar el historial (S-01).** Rotar `SECRET_KEY` invalida las sesiones; rotar `FERNET_KEY` obliga a re-cifrar cédulas. `git filter-repo` reescribe el historial público. Esfuerzo: medio.
- **Apagar `SEED_DEMO` y `PAYMENTS_SANDBOX_ENABLED` en producción (S-02, S-03).** Quita la clave pública y el pago gratis, pero rompe la demo del curso. En Render: `PAYMENTS_SANDBOX_ENABLED=False` y `SEED_DEMO=false`. Esfuerzo: bajo.
- **Definir `NUM_PROXIES`, `STORAGE_S3_BUCKET_PRIVADO` y sus credenciales en Render (S-06, I-04).** El código ya los soporta; falta la configuración de tu servicio. Esfuerzo: bajo.
- **`puede_publicar` fail-closed y vendedor sin verificación en `crear_pedido` (L-05, S-10).** Más seguro, pero invalida cuentas sin fila `Vendedor` y muchas pruebas. Esfuerzo: medio.
- **Índices `pg_trgm` para las búsquedas con `icontains` (R-08).** Acelera `?q=` en usuarios, productos y puestos, pero exige la extensión de PostgreSQL y una migración específica del motor. Esfuerzo: bajo.
