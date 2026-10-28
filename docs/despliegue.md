# Despliegue en Render (3 pasos)

Todo está automatizado en `render.yaml`:

- Render crea el servicio Docker **y la base PostgreSQL** (plan free).
- Genera `SECRET_KEY` y `FERNET_KEY` solo.
- Ejecuta `collectstatic`, `migrate` y `seed_masivo --if-empty` en el arranque:
  carga los datos solo si la base tiene menos de 100 registros.
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

- `https://TU-SERVICIO.onrender.com/api/health/` → `{"status":"ok","database":"up"}`
- `/` → app; `/admin/` → Django; `/api/docs/` → Swagger.

## Si quieres cambiar la contraseña demo

Antes del primer deploy, en el Blueprint agrega la variable
`SEED_DEMO_PASSWORD` con tu clave (o cámbiala en Environment y haz "Manual
Deploy"). El seed solo corre si la base tiene menos de 100 registros de dominio.

> Si la cambias, los botones de acceso rápido del login (que usan
> `RioMarket2026!`) dejarán de funcionar: escribe la clave a mano.

## Límites del plan free (importante)

- El servicio se duerme tras 15 min sin tráfico (despierta en ~1 min). Configura un ping gratuito (UptimeRobot o cron-job.org) a `/api/health/` cada 10 minutos.
- La base free de Render **caduca a los 30 días** (aviso por correo; 14 días de
  gracia para pasarla a pago).
- Disco efímero: las imágenes subidas se pierden en cada redeploy. Usa almacenamiento S3-compatible (Supabase Storage/R2/AWS) con las variables `STORAGE_S3_*`.
- Sin Shell en el plan free: los datos demo se cargan solos en el arranque con
  `seed_masivo --if-empty` y `seed_imagenes_demo`.

## Si necesitas que la base dure más de 30 días

Usa Supabase (free, no caduca):

1. Crea el proyecto y copia la URI del **Session pooler** (puerto 5432) con
   `?sslmode=require`.
2. En Render → Environment, reemplaza `DATABASE_URL` por esa cadena y haz
   "Manual Deploy".

## Almacenamiento S3-compatible (persistir imágenes)

1. En Supabase Storage crea dos buckets: `productos` (público) y `privado` (privado).
2. En Supabase → Settings → API/Storage crea claves S3 o usa las credenciales compatibles.
3. En Render añade las variables: `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY`, `STORAGE_S3_SECRET_KEY`, `STORAGE_S3_BUCKET_PUBLICO=productos`, `STORAGE_S3_BUCKET_PRIVADO=privado`. Opcional `STORAGE_PUBLIC_BASE_URL`.
4. Redeploy. Las imágenes subirán al bucket público; las fotos de cédula seguirán en almacén privado. Si no se configuran, se usa disco local (efímero).

Redis es opcional: define `REDIS_URL` (Render Key Value) solo si quieres caché
compartida; sin ella se usa memoria local.

## Montos de la demo

- Domicilio: 3000.00 (`DOMICILIO_TARIFA_BASE`) y comisión: 5 %
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
