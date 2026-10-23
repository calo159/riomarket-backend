# RioMarket Frontend

SPA del marketplace RioMarket para compradores, vendedores y administradores.
Consume la API REST del backend Django/DRF de este repositorio.

## Stack

- React 18 + TypeScript estricto + Vite
- React Router 6
- TanStack Query para estado del servidor
- Axios con JWT, refresh compartido y reintento ante `401`
- React Hook Form + Zod
- Tailwind CSS
- Vitest + Testing Library y Playwright

## Estado de cumplimiento

El encargo original está en [`PROMPT.md`](./PROMPT.md). Todas las fases están
implementadas:

| Fase | Alcance | Estado |
| --- | --- | --- |
| 1 | Base: Vite, Tailwind, scripts, HTTP con refresh compartido, sesión, RBAC y layouts | ✅ |
| 2 | Login, registro comprador/vendedor, redirección por rol, logout y sincronización entre pestañas | ✅ |
| 3 | Inicio, catálogo con filtros/orden/paginación, producto, puesto y carrito persistente de un solo puesto | ✅ |
| 4 | Checkout, pedidos, pagos, direcciones, notificaciones, perfil y reseñas | ✅ |
| 5 | Dashboard, verificación, puestos, productos, pedidos, cupones y reseñas del vendedor | ✅ |
| 6 | Métricas, verificaciones, pagos, cupones, auditoría y pedidos del administrador | ✅ |
| 7 | Modo demo, `React.lazy`, tests de interceptores y guards, smoke E2E, CI y documentación | ✅ |

Verificación local (última ejecución):

```text
npm run lint       ✅ sin errores ni warnings
npm run typecheck  ✅ sin errores
npm test           ✅ 2 archivos, 7 tests
npm run build      ✅ build de producción
npm run test:e2e   ✅ 2 smoke tests de Playwright
```

## Requisitos

- Node.js 20+
- Backend RioMarket en `http://127.0.0.1:8000` con datos de ejemplo
  (`python manage.py seed_demo`)

## Puesta en marcha

```bash
cd frontend
npm ci
copy .env.example .env   # Linux/macOS: cp .env.example .env
npm run dev
```

La app queda en <http://127.0.0.1:3000>.

Si el backend usa otra URL, cambia `VITE_API_URL` en `.env` (sin `/api`).

## Variables de entorno

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `VITE_API_URL` | URL base del backend, sin `/api` | `http://127.0.0.1:8000` |
| `VITE_DEMO_MODE` | Muestra botones de acceso rápido en `/login` | `true` en `.env.example` |
| `VITE_SANDBOX_PAGOS` | Permite elegir el método de pago sandbox | `true` en `.env.example` |
| `VITE_TARIFA_DOMICILIO` | Tarifa de domicilio usada en el estimado del checkout | `3000` |

`VITE_SANDBOX_PAGOS` debe coincidir con `PAYMENTS_SANDBOX_ENABLED` del backend.
La tarifa mostrada es solo un estimado: el backend calcula el total definitivo.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run build` | Typecheck y build de producción |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | ESLint sin warnings permitidos |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Tests unitarios con Vitest |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:e2e` | Smoke tests con Playwright |
| `npm run gen:api` | Regenera los tipos desde el esquema OpenAPI local |

Para los tests E2E la primera vez:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright levanta su propio servidor de Vite. Si ya tienes uno en el puerto
3000, lo reutiliza fuera de CI.

## Autenticación

- El `access` token vive solo en memoria.
- El `refresh` token se guarda en `localStorage` bajo `riomarket.refresh`.
- Ante un `401`, un interceptor intenta refrescar una sola vez y reintenta la
  petición original.
- Varias peticiones simultáneas comparten **una sola** promesa de refresh para
  evitar rotaciones dobles del token.
- Si el refresh falla, se limpia el refresh, se cierra la sesión y se redirige
  a `/login?expirada=1`.
- El cierre de sesión se sincroniza entre pestañas mediante el evento `storage`.
- Al cargar la app se restaura la sesión con el refresh y `/auth/perfil/` sin
  mostrar la pantalla de login mientras tanto.

La autorización real siempre la aplica el backend. La matriz de permisos del
frontend (`src/auth/permisos.ts`) solo controla qué rutas y acciones se muestran.

## Roles y rutas

| Rol | Inicio tras login | Rutas principales |
| --- | --- | --- |
| Comprador | `/` | `/catalogo`, `/carrito`, `/checkout`, `/mis-pedidos`, `/direcciones`, `/notificaciones`, `/perfil` |
| Vendedor | `/vendedor` | `/vendedor/verificacion`, `/vendedor/puestos`, `/vendedor/productos`, `/vendedor/pedidos`, `/vendedor/cupones`, `/vendedor/resenas` |
| Administrador | `/admin` | `/admin/verificaciones`, `/admin/pedidos`, `/admin/puestos`, `/admin/pagos`, `/admin/cupones`, `/admin/auditoria` |

Rutas protegidas:

- Sin sesión: redirección a `/login?redirect=<ruta original>`.
- Rol incorrecto: redirección a `/403`.

## Usuarios de demostración

Contraseña para todos: `RioMarket2026!`

| Rol | Correo |
| --- | --- |
| Administrador | `admin@riomarket.test` |
| Vendedor | `carmen@riomarket.test` |
| Vendedor | `diego@riomarket.test` |
| Comprador | `luis@riomarket.test` |

Con `VITE_DEMO_MODE=true`, el login muestra botones que rellenan las
credenciales de comprador, vendedor y administrador.

## Flujo de compra

1. El comprador arma el carrito. Un carrito solo admite productos de un puesto.
2. En el checkout elige retiro o domicilio, una dirección guardada o una
   dirección manual (se puede guardar en la libreta sin salir del checkout),
   notas y un cupón opcional.
3. Al crear el pedido se abre el detalle para registrar el pago.
4. El vendedor confirma el pedido (el backend exige un pago aprobado), lo pasa
   a preparación, lo envía y lo entrega.
5. El comprador puede reseñar el pedido entregado.
6. Los pagos en efectivo los confirma el vendedor; los pagos sandbox se
   aprueban o rechazan desde el detalle cuando el sandbox está habilitado.

## Estructura

```text
frontend/
├── e2e/                     # smoke tests Playwright
├── src/
│   ├── api/                 # funciones tipadas por recurso
│   ├── auth/                # sesión, tokens, RBAC y guards
│   ├── cart/                # carrito persistente
│   ├── components/
│   │   ├── layout/          # layouts y navegación
│   │   └── ui/              # componentes reutilizables
│   ├── lib/                 # HTTP, tipos, formato, errores, utilidades
│   ├── pages/
│   │   ├── admin/           # panel administrador
│   │   ├── auth/            # login y registro
│   │   └── vendedor/        # panel vendedor
│   └── test/                # setup de Vitest
├── playwright.config.ts
├── vite.config.ts
└── vitest.config.ts
```

## Pruebas

- `npm test`: interceptores HTTP (refresh compartido, reintento y pérdida de
  sesión) y rutas protegidas (login y `/403`).
- `npm run test:e2e`: smoke de portada, login y navegación al registro.
- `npm run lint`, `npm run typecheck` y `npm run build` también corren en CI.

## Limitaciones conocidas

- No hay endpoint de administración de usuarios ni de cambio de contraseña; el
  perfil solo permite editar nombre, correo y celular.
- `Puesto.estado` es de solo lectura en la API: el administrador puede consultar
  el directorio de puestos, pero no suspenderlos desde el frontend.
- El pago sandbox solo funciona si backend y frontend tienen habilitado el
  sandbox.
- Una dirección escrita manualmente en el checkout solo pasa a la libreta si
  marcas «Guardar esta dirección en mi libreta»; de lo contrario queda únicamente
  como snapshot del pedido.
- Las notificaciones por correo dependen de la configuración SMTP del backend.
- El bundle se divide por ruta; algunas rutas del panel cargan varios
  componentes y Vite puede avisar del tamaño de algún chunk.

## Más documentación

- [Prompt original del frontend](./PROMPT.md)
- [README principal del backend](../README.md)
- Swagger local: <http://127.0.0.1:8000/api/docs/>
