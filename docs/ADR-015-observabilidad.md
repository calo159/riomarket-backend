# ADR-015: observabilidad mínima

**Estado**: Aceptado

## Contexto

Cuando algo falla en Render (plan gratis) solo se cuenta con el visor de registros del servicio.
Los registros eran texto sin identificar la petición, así que no se podía reconstruir qué pasó
en una petición concreta, y `/api/health/` solo decía si la base respondía.

## Decisión

### Identificador de petición

- `RequestIdMiddleware` (`apps/common/observabilidad.py`) va **primero** en `MIDDLEWARE`.
  Toma el `X-Request-ID` entrante solo si cumple `[A-Za-z0-9-]{8,64}`; si no, genera un
  `uuid4().hex`. Un valor con espacios, saltos de línea, símbolos o más de 64 caracteres **nunca**
  se refleja (evita inyección en cabeceras y en registros).
- El valor queda en `request.request_id`, en un `ContextVar` (lo ven todos los registros de esa
  petición) y en la cabecera `X-Request-ID` de la respuesta, también en los errores.
- No añade consultas: el usuario se lee de `request.user` solo si otra capa ya lo resolvió.

### Registro de acceso

Una línea por petición en el logger `apps.acceso`: `metodo`, `ruta` (**sin query string**),
`estado`, `duracion_ms`, `usuario_id` (solo el número) y `request_id`. No lleva cuerpo,
cabeceras, cookies, correos ni celulares. Se omiten `/api/health/` (Render lo llama cada pocos
segundos) y `/assets/`.

### Registro estructurado

- `JsonFormatter` (sin dependencias) emite una línea JSON por registro:
  `ts`, `nivel`, `logger`, `msg`, `request_id` y, de una **lista blanca**, `metodo`, `ruta`,
  `estado`, `duracion_ms`, `usuario_id`, `pedido_id`, `cancelados`, `omitidos`. Nunca se vuelca
  `record.__dict__`. Las excepciones salen en el campo `error` (los saltos de línea los escapa JSON).
- `RedactarSecretos` reemplaza por `[oculto]` los JWT y los textos `password=...` que se cuelen
  en un mensaje o en una excepción (defensa en profundidad).
- `config/logs.py` construye `LOGGING`. En desarrollo y pruebas el formato sigue siendo el texto
  legible de siempre; `config/settings/prod.py` usa JSON por defecto (`LOG_FORMAT=texto` lo revierte
  sin tocar código). No hay que cambiar variables en Render.

### `/api/health/`

Público y barato. Responde 503 **solo** si la base cae (Render reinicia con 503 repetidos).

| Campo | Valores | Nota |
| --- | --- | --- |
| `status` | `ok` / `degraded` | |
| `database` | `up` / `down` | sin detalle del error |
| `version` | 7 caracteres del commit o `desconocida` | de `RENDER_GIT_COMMIT`, validado como hexadecimal |
| `migraciones` | `al_dia` / `pendientes` / `desconocido` | se calcula cada 10 min por proceso; un error degrada a `desconocido` |
| `almacenamiento_externo` | `true` / `false` | solo si hay almacenamiento S3; nunca bucket, endpoint ni claves |
| `hora_servidor` | ISO 8601 UTC | |

No expone `DEBUG`, nombres de variables, rutas del servidor, versiones de librerías ni errores
de la base.

## Alternativas descartadas

- **Sentry u OpenTelemetry**: exigen cuenta, claves y, a futuro, coste. Quedan como siguiente
  paso si el servicio sale del plan gratis.
- **Un paquete de registro JSON**: una dependencia más para algo que cabe en 40 líneas.
- **`request_id` en el cuerpo de los errores y en `handler500`** (previsto en el plan E2): fuera de
  esta entrega; cambia el contrato de los errores. La cabecera de la respuesta ya lo permite.

## Consecuencias

- Para investigar una falla: pedir al usuario el `X-Request-ID` (o buscar la ruta y la hora) y
  filtrar los registros de Render por ese valor.
- Los registros de Django que se emiten **después** de la cadena de middleware (los avisos 4xx de
  `django.request`, `django.server`) salen con `request_id: "-"`; el registro `apps.acceso` de la
  misma petición sí lo lleva. Los 500 sí quedan con identificador.
- Cobertura: el CI exige el umbral del backend (`--cov-fail-under`). El frontend no la mide aún
  porque `@vitest/coverage-v8` no está instalado y este cambio no añade dependencias.
