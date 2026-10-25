# Despliegue en Render (3 pasos)

Todo está automatizado en `render.yaml`:

- Render crea el servicio Docker **y la base PostgreSQL** (plan free).
- Genera `SECRET_KEY` y `FERNET_KEY` solo.
- Ejecuta `collectstatic`, `migrate` y crea los datos demo en el primer arranque
  (solo si la base está vacía).
- Configura HTTPS, `ALLOWED_HOSTS` y CSRF para `*.onrender.com`.

## Lo único que debes hacer tú

1. **Subir el repo a GitHub** (rama `main`).
2. En https://dashboard.render.com → **New → Blueprint** → conectar el repo →
   **Apply**. No hay que escribir ninguna variable.
3. Esperar el deploy y abrir la URL `https://riomarket.onrender.com`.

Usuario demo: `admin@riomarket.test` / `RioMarket2026!`
(también `carmen@`, `diego@`, `luis@riomarket.test` con la misma clave).

Verificación rápida:

- `https://TU-SERVICIO.onrender.com/api/health/` → `{"status":"ok","database":"up"}`
- `/` → app; `/admin/` → Django; `/api/docs/` → Swagger.

## Si quieres cambiar la contraseña demo

Antes del primer deploy, en el Blueprint agrega la variable
`SEED_DEMO_PASSWORD` con tu clave (o cámbiala en Environment y haz "Manual
Deploy"). El seed solo corre si la base está vacía.

## Límites del plan free (importante)

- El servicio se duerme tras 15 min sin tráfico (despierta en ~1 min).
- La base free de Render **caduca a los 30 días** (aviso por correo; 14 días de
  gracia para pasarla a pago).
- Disco efímero: las imágenes subidas se pierden en cada redeploy.
- Sin Shell en el plan free: los datos demo se crean solos en el arranque.

## Si necesitas que la base dure más de 30 días

Usa Supabase (free, no caduca):

1. Crea el proyecto y copia la URI del **Session pooler** (puerto 5432) con
   `?sslmode=require`.
2. En Render → Environment, reemplaza `DATABASE_URL` por esa cadena y haz
   "Manual Deploy".

Redis es opcional: define `REDIS_URL` (Render Key Value) solo si quieres caché
compartida; sin ella se usa memoria local.
