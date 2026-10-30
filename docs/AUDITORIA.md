# Auditoría general de RioMarket

Rama `mejora/auditoria-general`. Cinco revisiones en paralelo (seguridad, base de datos y rendimiento, frontend, infraestructura, lógica y tests); **cada hallazgo se verificó leyendo el código o con una prueba que falla antes y pasa después**. Los duplicados entre áreas se marcan con `=`.

## Resumen ejecutivo

- Hallazgos únicos: **91** (8 duplicados entre áreas).
- Por severidad: **2** crítico, **12** alto, **44** medio, **33** bajo.
- Por área: Frontend 22, Infraestructura 20, Seguridad 18, Rendimiento/BD 16, Lógica 15.
- Estado: **41** corregido, **38** propuesto, **12** corregido en parte.
- Línea base → final: 666 → 741 pruebas de backend, 33 → 54 de frontend; cobertura de backend 92 %.

### Top 10 de riesgos

1. **S-01** — `SECRET_KEY`, `FERNET_KEY` y la clave de la base están en el historial público de git. *Rotar es obligatorio.*
2. **S-02** — la clave del superusuario demo es pública y se reaplica en cada arranque de Render mientras `SEED_DEMO=true`.
3. **S-03** — con el sandbox activo, un comprador puede aprobar su propio pago (mitigado a pagos «simulados»).
4. **S-06/I-09** — el límite de intentos de login se evade con `X-Forwarded-For` y no es compartido entre procesos.
5. **I-04** — las fotos de cédula se guardan en disco efímero: tras un redeploy el documento desaparece.
6. **I-05** — el CI nunca prueba contra PostgreSQL; fallos como R-02 pasan desapercibidos.
7. **F-01** — los botones de pago se deciden por rol; falta la acción en `acciones_permitidas`.
8. **S-11** — el RBAC por recursos no gobierna pagos, cupones, notificaciones ni direcciones.
9. **L-05** — `puede_publicar` deja pasar a un vendedor sin fila de verificación.
10. **S-13** — el webhook no valida monto ni ventana de tiempo.

## Hallazgos

### Seguridad

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| S-01 | CRÍTICO | Credenciales reales (`DATABASE_URL`, `SECRET_KEY`, `FERNET_KEY`) en el historial de git; `origin/main` aún versiona `.env` | Propuesto | `baea219` lo desversiona (local, sin push). Hay que **rotar** y reescribir historial si se desea |
| S-02 | CRÍTICO | `SEED_DEMO=true` recrea en cada arranque el superusuario `admin@riomarket.test` con clave pública | Corregido en parte | `f2391d0`: `seed_masivo --if-empty`. La clave demo sigue siendo pública mientras `SEED_DEMO=true` |
| S-03 | ALTO | El comprador se autoaprueba cualquier pago con `simular_pago` (sandbox activo en producción) | Corregido en parte | `7c0f750`: solo pagos con método `simulado`. Apagar `PAYMENTS_SANDBOX_ENABLED` queda como decisión |
| S-04 | ALTO | Token de recuperación de contraseña escrito en los logs y sin envío de correo | Corregido | `7c0f750` |
| S-05 | MEDIO | Restablecer contraseña no es atómico, no cierra sesiones y no invalida tokens previos | Corregido | `7c0f750` |
| S-06 | ALTO | Throttling evadible con `X-Forwarded-For` y contador por proceso (sin `NUM_PROXIES`/Redis) | Propuesto | Depende de la topología de Render; ver propuestas |
| S-07 | ALTO | Reposición de stock al cancelar puede duplicarse (sin bloqueo del pedido ni `F()`) | Corregido | `aaa531c` |
| S-08 | MEDIO | El cupón no se repone al cancelar el pedido | Corregido | `aaa531c` |
| S-09 | MEDIO | `save()` completo al editar productos/puestos pisa la moderación y el stock | Corregido | `906b01b` |
| S-10 | MEDIO | Vendedor no verificado/rechazado sigue confirmando pedidos y cobros | Corregido en parte | `15bbd9e`: confirmar/preparar/enviar y cobrar en efectivo. Falta `crear_pedido` y suspender puestos al rechazar |
| S-11 | MEDIO | RBAC por recursos aplicado a medias (pagos, cupones, notificaciones, direcciones siguen por rol) | Propuesto | Alcance documentado en el README (Decisión 14) |
| S-12 | MEDIO | Anti-escalada incompleta: se podían entregar recursos que el actor no tiene y editar roles de sistema | Corregido | `15bbd9e` |
| S-13 | MEDIO | Webhook sin idempotencia, ventana de tiempo ni verificación de monto | Corregido en parte | `7c0f750`: idempotente. Anti-replay y monto quedan propuestos |
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
| R-06 | MEDIO | `tiene_recurso` consulta la BD en cada llamada, sin caché por petición | Corregido en parte | `8a2b378` en el listado de usuarios; el resto queda propuesto |
| R-07 | MEDIO | Listado de pedidos con `OR` sobre join: escaneo completo | Corregido | `9802e78` |
| R-08 | MEDIO | Casi ningún modelo declara `Meta.indexes` | Corregido en parte | `feb0753`: 6 índices (pedido, producto, pago, notificación, reseña). `Puesto`, `Usuario` y `pg_trgm` propuestos |
| R-09 | MEDIO | Filtro de fechas de auditoría con `__date` anulaba el índice | Corregido | `dd31ca3` |
| R-10 | MEDIO | `COUNT` del listado de puestos arrastraba reseñas y la fila del vendedor | Corregido | `9802e78` |
| R-11 | MEDIO | `COUNT` del listado de usuarios hacía join/group by con todos los pedidos | Corregido | `9802e78` |
| R-12 | MEDIO | Listado de roles: dos `Count` sobre dos joins multiplican filas | Corregido | `9802e78` |
| R-13 | BAJO | `reordenar_imagenes` hace un UPDATE por id y no limitaba la lista | Corregido en parte | `bf9364c`: validación y tope; `bulk_update` propuesto |
| R-14 | BAJO | `IntegrityError` en carreras daba 500 | Corregido | `bf9364c` (ver L-09) |
| R-15 | BAJO | `select_related` sin uso en notificaciones, pedidos, direcciones y pagos | Corregido | `dd31ca3`. Reseñas lo conserva (usa `usuario_nombre`) |
| R-16 | BAJO | `resumen()` hace 15 consultas sin caché | Propuesto |  |
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
| L-11 | MEDIO | Neto del vendedor negativo con cupón del 100 % | Propuesto | Decisión de negocio: quién asume la comisión |
| L-12 | BAJO | Redondeo del descuento (`ROUND_DOWN`) inconsistente con `pricing.py` | Propuesto |  |
| L-13 | MEDIO | Calificación fuera de rango y regla «una reseña por pedido» implementada como «por puesto» | Corregido en parte | `bf9364c`: rango 1–5. La regla por pedido/puesto requiere decisión |
| L-14 | MEDIO | Un pago rechazado no se puede reintentar | Propuesto |  |
| L-15 | MEDIO | Webhook no idempotente (reintentos dan 400) | Corregido | `7c0f750` |
| L-16 | BAJO | Formato de errores no uniforme (lista en vez de dict por campo) | Propuesto |  |
| L-17 | BAJO | Categorías con padre propio o ciclos | Corregido | `bf9364c` |
| L-18 | BAJO | Direcciones: coordenadas fuera de rango y `DELETE` que se salta el servicio | Corregido en parte | `bf9364c`: rangos. `destroy` propuesto |
| L-19 | MEDIO | Recuperación de contraseña sin correo ni pruebas | Duplicado | = S-04 (se añadieron pruebas) |
| L-20 | BAJO | Producto con precio 0 permitido | Propuesto |  |

### Infraestructura

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| I-01 | CRÍTICO | Credenciales en el historial | Duplicado | = S-01 |
| I-02 | ALTO | Cada arranque en Render re-siembra y resetea la clave del admin | Duplicado | = S-02 |
| I-03 | ALTO | Documentos afirman `--if-empty` que el script no usaba | Corregido | `f2391d0` hace verdad lo documentado |
| I-04 | ALTO | La foto de cédula nunca va a S3 y se pierde en cada redeploy | Propuesto | Implementar `PrivateMediaStorage` sobre S3 o usar disco persistente |
| I-05 | ALTO | El servicio Postgres del CI no se usa (tests en SQLite) | Propuesto | Definir `TEST_DATABASE_URL` en `ci.yml`; no pude validarlo en este entorno |
| I-06 | MEDIO | README promete un `.env` versionado; un clon limpio no arranca | Corregido | README actualizado |
| I-07 | MEDIO | Sin `DATABASE_URL`, producción cae en SQLite efímero sin avisar | Propuesto |  |
| I-08 | MEDIO | `index.html` y estáticos se sirven sin CSP ni `X-Frame-Options` | Corregido | `f2391d0` (+ prueba de orden de middleware) |
| I-09 | MEDIO | Límites de peticiones por proceso (sin Redis, 2 workers) | Propuesto | = S-06 |
| I-10 | MEDIO | Versiones instaladas distintas a las fijadas; sin lockfile | Propuesto |  |
| I-11 | MEDIO | `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` abiertos a todo `onrender.com` | Propuesto | Usar el hostname exacto |
| I-12 | MEDIO | `entrega/*.sql|json` obsoletos, con hashes de contraseña | Propuesto | No se borraron (regla 3) |
| I-13 | MEDIO | Postman: el paso «Entregar» usaba el token del vendedor | Corregido | `f2391d0` |
| I-14 | BAJO | `README.en.md` desincronizado | Propuesto |  |
| I-15 | BAJO | Cifras de pruebas obsoletas en README/MANTENIMIENTO | Corregido en parte | README.md actualizado; MANTENIMIENTO.md pendiente |
| I-16 | BAJO | Prompts de IA en `docs/` y ADR-008 fuera de lugar | Propuesto | No se borraron |
| I-17 | BAJO | `requests` falta en `requirements-dev.txt` | Corregido | `f2391d0` |
| I-18 | BAJO | `.env.example` sin `JWT_*` ni `TEST_DATABASE_URL` | Corregido | `f2391d0` |
| I-19 | BAJO | `FERNET_KEY` inválida se re-deriva en silencio | Propuesto |  |
| I-20 | BAJO | Producción acepta una `SECRET_KEY` de ejemplo o corta | Corregido | `f2391d0` |
| I-21 | BAJO | Dockerfiles: `build-essential` en la imagen final, `npm ci || npm install`, etc. | Propuesto |  |
| I-22 | BAJO | Archivos sobrantes (`package-lock.json` en la raíz) | Corregido en parte | `f2391d0` borra el lockfile; el resto propuesto |

### Frontend

| ID | Severidad | Hallazgo | Estado | Commit / nota |
| --- | --- | --- | --- | --- |
| F-01 | ALTO | «Confirmar cobro en efectivo» y «pagar» se deciden por rol, no por ser el vendedor/comprador de ese pedido | Propuesto | Requiere que el backend exponga la acción en `acciones_permitidas` |
| F-02 | ALTO | El admin aprueba cédulas sin poder verlas | Corregido | `cbae80a` |
| F-03 | ALTO | Un fallo de `/auth/menu/` se ve como 403 en todas las rutas de panel | Corregido | `a7a0275` |
| F-04 | ALTO | Al reemplazar el carrito se pierde la cantidad elegida | Corregido | `a7a0275` |
| F-05 | MEDIO | Caracteres corruptos (U+FFFD) en `PedidosAdmin.tsx` | Corregido | `a7a0275` |
| F-06 | MEDIO | Reembolsar/anular sin confirmación; botones solo-icono sin nombre accesible | Corregido | `cbae80a` |
| F-07 | MEDIO | El carrito sobrevive al cierre de sesión | Corregido | `a7a0275` |
| F-08 | MEDIO | «Ingresos aprobados» sumado en cliente con tope de 100 | Propuesto | Endpoint de resumen en el backend |
| F-09 | MEDIO | El efecto de direcciones del checkout pisa lo que el usuario edita | Propuesto |  |
| F-10 | MEDIO | Modal sin trampa de foco | Propuesto |  |
| F-11 | MEDIO | ARIA inválido en `AccountMenu` y drawer móvil | Propuesto |  |
| F-12 | MEDIO | Claves de consulta inconsistentes (id numérico vs string) | Propuesto |  |
| F-13 | MEDIO | «Hoy» calculado en UTC en cupones | Corregido | `cbae80a` |
| F-14 | BAJO | Formato de calificación y etiquetas de estado duplicados | Propuesto |  |
| F-15 | BAJO | Componentes de más de 300 líneas (`PedidoDetalle` 580) | Propuesto |  |
| F-16 | BAJO | Código muerto (`actualizarPedido`, tipos exportados sin uso, `limpiarRefresh` vacío) | Propuesto |  |
| F-17 | BAJO | `as any` en tarjetas y `api-types.ts` desfasado de las imágenes | Propuesto |  |
| F-18 | BAJO | Imágenes sin `width/height`; hero con `loading=lazy` | Propuesto |  |
| F-19 | BAJO | Estados de carga/vacío/título inconsistentes | Corregido en parte | Pagos y Verificaciones corregidos en `cbae80a` |
| F-20 | BAJO | `staleTime` y sondeos redundantes | Propuesto |  |
| F-21 | BAJO | Bucle con `?redirect=/login` | Corregido | `64370a0` |
| F-22 | BAJO | e2e con solo 2 pruebas | Propuesto |  |

## Mediciones (antes → después)

| Caso | Antes | Después |
| --- | --- | --- |
| `crear_pedido` por API, 1 línea / 12 líneas | 37 / 70 consultas | 36 / 47 |
| Rechazar un pedido de 120 líneas inventadas | 121 consultas | menos de 20 |
| `invalidar_sesiones` con 10 tokens (suspender/cambiar rol) | 60 consultas (4 por token) | 2 |
| `COUNT` del listado de usuarios admin | join + group by con `orders_pedido` | sin join |
| `COUNT` del listado público de puestos | `DISTINCT` + `AVG` + join con reseñas | sin join |
| Pedidos por estado ordenados por fecha (SQLite) | `SCAN` + `TEMP B-TREE` | `SEARCH … USING COVERING INDEX pedido_estado_fecha_idx` |
| Productos activos por nombre | `SCAN` + `TEMP B-TREE` | `SEARCH … USING COVERING INDEX producto_estado_nombre_idx` |
| Pagos por estado / notificaciones no leídas | `SCAN` / índice solo por usuario | índice compuesto |
| Tests: listados personales con 2 vs 12 filas | — | consultas constantes (guardia en `tests/test_consultas.py`) |

## Propuestas pendientes (requieren decisión)

- **Rotar credenciales y limpiar el historial (S-01).** Rotar `SECRET_KEY` invalida las sesiones; rotar `FERNET_KEY` obliga a re-cifrar cédulas. `git filter-repo` reescribe el historial público. Esfuerzo: medio.
- **Apagar `SEED_DEMO` y `PAYMENTS_SANDBOX_ENABLED` en producción (S-02, S-03).** Quita la clave pública y el pago gratis, pero rompe la demo del curso. Alternativa: `SEED_DEMO_PASSWORD` con `generateValue`. Esfuerzo: bajo.
- **`NUM_PROXIES` + Redis para el throttling (S-06).** Necesita saber cuántos proxies hay delante en Render. Esfuerzo: bajo.
- **Almacén privado S3 para cédulas (I-04).** Persistencia real del documento; añade dependencia operativa. Esfuerzo: medio.
- **CI contra PostgreSQL (I-05).** Detecta diferencias de motor; puede revelar fallos latentes. Esfuerzo: bajo.
- **Acción `confirmar-pago` en `acciones_permitidas` (F-01).** Cambia el contrato de la API y el frontend a la vez. Esfuerzo: medio.
- **`puede_publicar` fail-closed y vendedor sin verificación en `crear_pedido` (L-05, S-10).** Más seguro, pero invalida cuentas sin fila `Vendedor` y muchas pruebas. Esfuerzo: medio.
- **Validación del webhook: ventana de tiempo, monto y referencia (S-13).** Depende de la pasarela real. Esfuerzo: medio.
- **Decisión de negocio: reseña por pedido o por puesto (L-13), neto con cupón del 100 % (L-11), reintento de pago rechazado (L-14).** Cada una cambia reglas del dominio. Esfuerzo: bajo a medio.
- **Borrar `entrega/*.sql|json`, prompts de `docs/` y sincronizar `README.en.md` (I-12, I-14, I-16).** No se hizo para respetar la regla de no borrar entregables. Esfuerzo: bajo.
- **Refactor del frontend: dividir `PedidoDetalle`, centralizar claves de consulta, trampa de foco en `Modal` (F-10, F-12, F-15).** Mejora mantenibilidad y accesibilidad sin cambiar funciones. Esfuerzo: medio.
