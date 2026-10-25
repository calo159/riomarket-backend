# Despliegue en Render

## Arquitectura
Un solo servicio web (Docker) sirve Django + build del frontend (WhiteNoise). Base de datos en Supabase (Session pooler con sslmode=require).

## Pasos manuales (exactos)
1. Crear Blueprint desde repo GitHub (conectar repo).
2. Usar `render.yaml` - pulsar "Apply".
3. En Environment > Secret Files/Variables añadir:
   - SECRET_KEY (sync:false)
   - FERNET_KEY (sync:false)
   - DATABASE_URL (postgresql://... con ?sslmode=require)
   - PAYMENTS_WEBHOOK_SECRET (sync:false)
   - RENDER_EXTERNAL_HOSTNAME (opcional)
4. Desplegar. Health check: /api/health/
5. Ver logs si falla.

## Notas
- Servicio se duerme tras ~15 min sin tráfico (despertar ~30-60s antes de demo)
- Disco efímero - no guardar subidas permanentes
- Cookies refresh: HttpOnly; Secure; SameSite=Strict en prod
- No ejecutar seed_masivo en cada arranque
