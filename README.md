# RioMarket — Backend

API REST de un marketplace para los puestos de mercado de Riohacha. Django 5 +
DREST Framework, autenticación JWT, PostgreSQL y documentación OpenAPI.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Django 5.1 + Django REST Framework 3.17 |
| Auth | JWT (simplejwt) con rotación de refresh y blacklist |
| Base de datos | PostgreSQL 16 (SQLite solo para tests) |
| Cache / tareas | Redis 7 + Celery 5 |
| Documentación | drf-spectacular (Swagger UI, Redoc, esquema OpenAPI) |
| Calidad | ruff (lint + format), pytest + pytest-django + factory_boy |
| Contenedores | Docker Compose (postgres, redis, web, celery_worker) |

## Módulos

| App | Ruta base | Estado |
| --- | --- | --- |
| `accounts` | `/api/auth/` | ✅ Registro, login/logout JWT, perfil |
| `accounts` (trust) | `/api/verificacion/` | ✅ Verificación de identidad con foto de cédula (almacenamiento privado) |
| `catalog` | `/api/catalog/` | ✅ Categorías, puestos, productos e imágenes |
| `orders` | `/api/orders/` | ✅ Pedidos: creación con stock atómico y máquina de estados |
| `common` | `/api/health/` | ✅ Health check, permisos por rol, crypto, paginación |
| `addresses`, `notifications`, `payments`, `promotions`, `trust`, `audit` | — | 🚧 Apps creadas, sin endpoints aún |

### Reglas de negocio implementadas

1. **Catálogo** — solo el vendedor dueño administra su puesto y productos; las
   imágenes se validan por tipo MIME y tamaño; nada se borra si hay historial
   (`PROTECT`), se desactiva.
2. **Confianza (trust)** — el vendedor debe tener la identidad verificada
   (cédula) para publicar; la foto de cédula vive fuera del medio público.
3. **Verificación** — el usuario sube su solicitud y un administrador la
   aprueba o rechaza; la cédula se sirve solo al dueño o al admin.
4. **Pedidos (creación)** — un pedido agrupa ítems de **un solo puesto**,
   congela nombre/precio en los ítems, calcula montos en el servidor y
   descuenta el stock de forma atómica (`select_for_update`); cancelar repone
   el stock exactamente una vez.
5. **Pedidos (estados)** — `pendiente → confirmado → en_preparacion →
   en_camino → entregado` (+ `cancelado`); cada transición tiene rol asignado
   (vendedor dueño, comprador o admin).

## Arranque rápido

### Con Docker (recomendado)

```bash
cp .env.example .env        # ajustar secretos
docker compose up --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py seed_demo   # datos de ejemplo
```

- API: `http://localhost:8000/api/health/`
- Swagger UI: `http://localhost:8000/api/docs/`
- Admin Django: `http://localhost:8000/admin/`

### Local (sin Docker)

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows; en Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env          # y apuntar DATABASE_URL a tu PostgreSQL
set DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py runserver
```

## Variables de entorno

Todas se leen con `django-environ`; la plantilla completa está en
[`.env.example`](.env.example). Las más relevantes:

| Variable | Descripción |
| --- | --- |
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` / `.prod` / `.test` |
| `DATABASE_URL` | PostgreSQL (`postgres://usuario:pass@host:5432/db`) |
| `REDIS_URL`, `CELERY_BROKER_URL` | Redis y broker de Celery |
| `FERNET_KEY` | Clave de cifrado (obligatoria con `DEBUG=False`) |
| `CORS_ALLOWED_ORIGINS` | Whitelist explícita (nunca `*`) |
| `PLATFORM_COMMISSION_PERCENTAGE` | Comisión de plataforma (pagos) |

Nunca subir un `.env` real al repositorio.

## Endpoints principales

| Método y ruta | Descripción | Auth |
| --- | --- | --- |
| `POST /api/auth/registro/` | Registro de usuario (comprador o vendedor) | pública |
| `POST /api/auth/login/` | Login → access + refresh JWT | pública |
| `POST /api/auth/token/refresh/` | Renovar el access token | pública |
| `GET/PATCH /api/auth/perfil/` | Ver y editar el perfil | autenticado |
| `GET /api/verificacion/mi-verificacion/` | Estado de mi verificación | autenticado |
| `POST /api/verificacion/mi-verificacion/` | Enviar solicitud con foto de cédula | autenticado |
| `GET /api/verificacion/solicitudes/` | Cola de solicitudes | admin |
| `POST /api/verificacion/solicitudes/{id}/` | Aprobar o rechazar | admin |
| `GET /api/catalog/categorias/` | Listado público de categorías | pública |
| `GET/POST /api/catalog/puestos/` | Puestos (crear = vendedor aprobado) | vendedor |
| `POST /api/catalog/puestos/{id}/categorias/` | Asociar categorías al puesto | dueño/admin |
| `GET/POST /api/catalog/productos/` | Productos del catálogo | crear: dueño |
| `POST /api/catalog/productos/{id}/imagenes/` | Subir imagen de producto | dueño |
| `GET/POST /api/orders/pedidos/` | Listar (los míos) y crear pedidos | autenticado |
| `PATCH /api/orders/pedidos/{id}/` | Editar dirección/notas (solo pendiente) | comprador |
| `POST /api/orders/pedidos/{id}/confirmar/` | `pendiente → confirmado` | vendedor/admin |
| `POST /api/orders/pedidos/{id}/en-preparacion/` | `confirmado → en_preparacion` | vendedor/admin |
| `POST /api/orders/pedidos/{id}/enviar/` | `en_preparacion → en_camino` | vendedor/admin |
| `POST /api/orders/pedidos/{id}/entregar/` | `en_camino → entregado` | partes/admin |
| `POST /api/orders/pedidos/{id}/cancelar/` | Cancelar y reponer stock | partes/admin |
| `GET /api/health/` | Health check (DB) | pública |

Detalle completo (filtros, parámetros, esquemas): **`/api/docs/`** (Swagger),
**`/api/docs/redoc/`** (Redoc) o `/api/schema/` (JSON/YAML crudo).

### Formato de error

Todas las respuestas de error usan el mismo envoltorio:

```json
{
  "success": false,
  "status_code": 400,
  "errors": { "items": ["Stock insuficiente para 'Arepa': quedan 2 unidades."] }
}
```

## Autenticación y roles

- Bearer JWT: `Authorization: Bearer <access>` (vía `/api/auth/login/`).
- Roles en `Usuario.rol`: `comprador`, `vendedor`, `administrador`; los
  vendedores pasan por verificación de identidad antes de operar.
- Permisos reutilizables en `apps/common/permissions.py`:
  `EsComprador`, `EsVendedor`, `EsVendedorAprobado`, `EsAdministrador`,
  `EsDuenoOAdmin`.

## Convenciones del código

- **`services.py` por app**: toda regla de negocio vive en la capa de
  servicios; los serializers solo validan forma y las vistas orquestan.
- **Errores**: se lanza `django.core.exceptions.ValidationError` (→ 400) o
  `PermissionDenied` (→ 403) y el handler global los envuelve en el formato
  estándar (`apps/common/exceptions.py`).
- **Querystring**: helpers en `apps/common/query.py` (`parametro_entero`,
  `parametro_booleano`, `aplicar_ordenamiento` con whitelist de campos).
- **Historial**: FKs `PROTECT` en todo lo que documenta el pasado (pedidos,
  ítems, verificaciones); en vez de borrar, se desactiva.

## Comandos de desarrollo

```bash
python manage.py migrate                       # migraciones
python manage.py seed_demo                     # datos de ejemplo
python manage.py spectacular --validate        # validar esquema OpenAPI
python manage.py runserver                     # servidor de desarrollo

pytest                                         # suite completa (~276 pruebas)
pytest apps\orders -q --cov=apps.orders        # tests de un módulo con cobertura
ruff check apps tests config --no-cache        # lint
ruff format apps tests config --no-cache       # formato
```

## Estructura

```
backend/
├── apps/
│   ├── accounts/       # usuarios, JWT, verificación de identidad
│   ├── addresses/      # 🚧 direcciones de entrega
│   ├── audit/          # 🚧 auditoría de acciones
│   ├── catalog/        # categorías, puestos, productos, imágenes
│   ├── common/         # permisos, exceptions, crypto, query, pagination
│   ├── notifications/  # 🚧 notificaciones
│   ├── orders/         # pedidos (models, services, views, urls)
│   ├── payments/       # 🚧 pagos y comisiones
│   ├── promotions/     # 🚧 promociones
│   └── trust/          # 🚧 confianza / reputación
├── config/
│   ├── settings/       # base, dev, prod, test
│   └── urls.py
├── tests/              # factories compartidas
├── docker-compose.yml
└── requirements*.txt
```

## Roadmap

- ✅ Fase 0 — setup (Django + DRF, Docker, calidad, ADRs)
- ✅ Fase 1 — catálogo + auth JWT
- ✅ Fase 2 — verificación de identidad (trust)
- ✅ Fase 3 — pedidos (stock atómico + máquina de estados)
- ⬜ Fase 4 — pagos (tarifa de domicilio, comisión de plataforma)
- ⬜ Fase 5 — direcciones y notificaciones
- ⬜ Fase 6 — promociones, reputación y auditoría
