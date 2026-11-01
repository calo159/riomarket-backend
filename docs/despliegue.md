# Despliegue en Render (3 pasos)

Todo está automatizado en `render.yaml`:

- Render crea el servicio Docker **y la base PostgreSQL** (plan free).
- Genera `SECRET_KEY` y `FERNET_KEY` solo.
- Ejecuta `collectstatic`, `migrate`, `seed_masivo` y `seed_imagenes_demo` en
  cada arranque: actualiza las contraseñas demo y completa los datos faltantes.
  Después corre `generar_miniaturas` (idempotente, máx. 200 imágenes por arranque
  y con `|| true`): crea la miniatura y las medidas de las fotos que no las tienen.
- Durante el build de Docker, `python -m whitenoise.compress frontend/dist`
  deja los `.br` y `.gz` junto a cada archivo del build; sin ese paso WhiteNoise
  entrega el JS y el CSS sin comprimir. Ver [ADR-011](ADR-011-rendimiento-y-seo.md).
- Configura HTTPS, `ALLOWED_HOSTS` y CSRF para `*.onrender.com`.

## Lo único que debes hacer tú

1. **Subir el repo a GitHub** (rama `main`).
2. En https://dashboard.render.com → **New → Blueprint** → conectar el repo →
   **Apply**. No hay que escribir ninguna variable.
3. Esperar el deploy y abrir la URL que muestre Render (por defecto
   `https://riomarket.onrender.com`; puede cambiar si el nombre está ocupado).

Usuario demo: `admin@riomarket.test` / `RioMarket2026!`
(también `carmen@`, `diego@`, `luis@riomarket.test` con la misma clave).

Verificación rápida:

- `https://TU-SERVICIO.onrender.com/api/health/` → `{"status": "ok", "database": "up", "version": "f7b4aa8", "migraciones": "al_dia", "almacenamiento_externo": true, "hora_servidor": "2026-10-31T18:17:04Z"}`
  (ver «Observabilidad» más abajo).
- `/` → app; `/admin/` → Django; `/api/docs/` → Swagger.
- `/robots.txt` → texto plano con `Sitemap:`; `/sitemap.xml` → XML con la tienda,
  el catálogo, el mapa y los puestos y productos activos.
- `curl -sI -H 'Accept-Encoding: br,gzip' https://TU-SERVICIO.onrender.com/assets/<archivo>.js`
  → `Content-Encoding: br` y `Cache-Control: max-age=315360000, public, immutable`;
  `curl -sI https://TU-SERVICIO.onrender.com/tienda` → `Cache-Control: no-cache`.

### Aviso del primer despliegue con este cambio

Las sesiones iniciadas **antes** de esta versión no tienen la cookie de pista
`rm_hay_sesion` y aparecerán cerradas una sola vez: hay que volver a iniciar
sesión (ver [ADR-011](ADR-011-rendimiento-y-seo.md), decisión 6).

## Si quieres cambiar la contraseña demo

En el Blueprint agrega la variable `SEED_DEMO_PASSWORD` con tu clave (o
cámbiala en Environment y haz "Manual Deploy"). El seed corre en cada arranque
y actualiza la contraseña de las cuentas demo, incluso si la base ya estaba
sembrada.

> Si la cambias, los botones de acceso rápido del login (que usan
> `RioMarket2026!`) dejarán de funcionar: escribe la clave a mano.

## Límites del plan free (importante)

- El servicio se duerme tras 15 min sin tráfico (despierta en ~1 min). Configura un ping gratuito (UptimeRobot o cron-job.org) a `/api/health/` cada 10 minutos.
- La base free de Render **caduca a los 30 días** (aviso por correo; 14 días de
  gracia para pasarla a pago).
- Disco efímero: las imágenes subidas se pierden en cada redeploy. Usa almacenamiento S3-compatible (Supabase Storage/R2/AWS) con las variables `STORAGE_S3_*`.
- Sin Shell en el plan free: los datos demo y las imágenes se cargan solos en
  cada arranque con `seed_masivo` y `seed_imagenes_demo`.

## Observabilidad ([ADR-015](ADR-015-observabilidad.md))

- Cada respuesta lleva la cabecera `X-Request-ID` (se reutiliza la que envíe el cliente solo si son
  8 a 64 letras, números o guiones; si no, se genera una). Con ella se busca todo lo ocurrido en una
  petición: en el visor de **Logs** de Render, filtra por ese valor (`"request_id": "..."`).
- En producción los registros salen en **JSON de una línea** (`ts`, `nivel`, `logger`, `msg`,
  `request_id` y, en `apps.acceso`, `metodo`, `ruta` sin query string, `estado`, `duracion_ms` y
  `usuario_id`). No llevan cuerpo, cabeceras, cookies, correos ni celulares. `LOG_FORMAT=texto`
  vuelve al formato legible sin cambiar código (opcional; no hay que tocar variables de Render).
- `/api/health/` (público; Render lo usa como `healthCheckPath`):

  | Campo | Significado |
  | --- | --- |
  | `status` / `database` | `ok`/`up`; si la base cae responde 503 con `degraded`/`down` |
  | `version` | 7 caracteres del commit desplegado (`desconocida` si Render no lo informa) |
  | `migraciones` | `al_dia`, `pendientes` o `desconocido` (se revisa cada 10 min) |
  | `almacenamiento_externo` | `true` si las imágenes van a S3; `false` si usan disco efímero |
  | `hora_servidor` | hora UTC del servidor |

  Las migraciones pendientes o el almacenamiento local **no** provocan 503 (Render reiniciaría el
  servicio sin necesidad).

## Si necesitas que la base dure más de 30 días

Usa Supabase (free, no caduca):

1. Crea el proyecto y copia la URI del **Session pooler** (puerto 5432) con
   `?sslmode=require`.
2. En Render → Environment, reemplaza `DATABASE_URL` por esa cadena y haz
   "Manual Deploy".

## Almacenamiento S3-compatible (persistir imágenes)

1. En Supabase Storage crea dos buckets: `productos` (público) y `privado` (privado).
2. En Supabase → Settings → API/Storage crea claves S3 o usa las credenciales compatibles.
3. En Render añade las variables: `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY`, `STORAGE_S3_SECRET_KEY`, `STORAGE_S3_BUCKET_PUBLICO=productos`, `STORAGE_S3_BUCKET_PRIVADO=privado`. Opcional `STORAGE_PUBLIC_BASE_URL`: usa la raíz pública (`https://<ref>.supabase.co/storage/v1/object/public`) o la URL que ya incluya el bucket.
4. Redeploy. Las imágenes subirán al bucket público; las fotos de cédula seguirán en almacén privado. Si no se configuran, se usa disco local (efímero).
5. Las imágenes demo se generan con `python scripts/generar_placeholders.py`. Para buscar fotos libres sin API key usa `python scripts/buscar_imagenes_libres.py` (Openverse); las candidatas quedan en `seed_images/candidatas/` y sus créditos en `seed_images/CREDITOS.md`.

Redis es opcional: define `REDIS_URL` (Render Key Value) solo si quieres caché
compartida; sin ella se usa memoria local.

## Correo para «Olvidé mi contraseña»

El plan gratis de Render bloquea los puertos SMTP, así que el correo sale por la API HTTP de
[Brevo](https://www.brevo.com) (plan gratis: 300 correos al día, sin dominio propio).

1. Crea la cuenta en Brevo y verifica un remitente (Senders → Add a sender): será el «de» de los correos.
2. En Brevo → SMTP & API → API Keys crea una clave.
3. En Render → Environment añade `BREVO_API_KEY` (la clave) y `DEFAULT_FROM_EMAIL` (el remitente verificado). La dirección
   del enlace sale sola de `RENDER_EXTERNAL_URL`; si usas otro dominio, define `FRONTEND_URL`.
4. Redeploy. Con la clave puesta el envío queda activo; también el de avisos de pedidos por correo
   (`NOTIFICATIONS_EMAIL_ENABLED`, que pasa a `true` si no lo fijas).

Sin esas variables la pantalla funciona, pero ningún correo sale. Las respuestas no revelan si un correo está registrado.

## Montos de la demo

- Domicilio: 3000.00 (`DOMICILIO_TARIFA_BASE`) y comisión: 8 %
  (`PLATFORM_COMMISSION_PERCENTAGE`). Se pueden cambiar en Environment.
- Si cambias la tarifa, actualiza también `VITE_TARIFA_DOMICILIO` en
  `Dockerfile.render` (vista previa del checkout) y redeploy: el monto final
  siempre lo calcula el backend.
- Si editas variables en `render.yaml` después del primer deploy, sincroniza el
  Blueprint (**Manual Sync**) o cámbialas en Environment; un deploy normal puede
  no aplicar los cambios del archivo.

## Antes de publicar el repo

`.env` está versionado a propósito para la entrega y contiene credenciales de
Supabase. Como el repositorio es público, después de la entrega rota la
contraseña de la base o haz el repo privado.
