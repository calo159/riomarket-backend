# RioMarket Frontend

SPA del marketplace RioMarket para compradores, vendedores y administradores.
Consume la API REST del backend Django/DRF de este repositorio.

## Stack

- React 18 + TypeScript estricto + Vite 5
- React Router 6
- TanStack Query para estado del servidor
- Axios con JWT en memoria, refresh por cookie HttpOnly y reintento ante `401`
- React Hook Form + Zod
- Tailwind CSS
- Vitest + Testing Library y Playwright

## Estado de cumplimiento

El alcance y las decisiones del encargo están en
[`docs/alcance-frontend.md`](../docs/alcance-frontend.md). Las fases 1–7 están
implementadas: base y sesión, autenticación, catálogo y carrito, pedidos/pagos,
panel del vendedor, panel del administrador y calidad/documentación.

Verificación local:

```text
npm run lint       sin errores ni warnings
npm run typecheck  sin errores
npm test           6 archivos, 18 pruebas
npm run build      build de producción correcto
```

## Requisitos

- Node.js 20+
- Backend RioMarket en `http://127.0.0.1:8000` con datos:
  `python manage.py seed_masivo`

## Puesta en marcha

```bash
cd frontend
npm ci
copy .env.example .env   # Linux/macOS: cp .env.example .env
npm run dev
```

La app queda en <http://127.0.0.1:3000>. Por defecto usa el proxy de Vite (`/api`
y `/media`) hacia el backend en el puerto 8000. Si el frontend se sirve desde
otro origen, define `VITE_API_URL` en `.env` (sin `/api`); no mezcles
`localhost` con `127.0.0.1`, porque la cookie de refresh es `SameSite=Strict`.

## Variables de entorno

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `VITE_API_URL` | URL base opcional del backend, sin `/api` | vacío (mismo origen/proxy) |
| `VITE_DEMO_MODE` | Muestra botones de acceso rápido en `/login` | `true` |
| `VITE_SANDBOX_PAGOS` | Permite elegir el método de pago sandbox | `true` |
| `VITE_TARIFA_DOMICILIO` | Tarifa usada en el estimado del checkout | `3000` |

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
| `npm run gen:api` | Regenera los tipos desde el OpenAPI local |

Para E2E la primera vez:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright levanta su propio servidor de Vite. Si ya hay uno en el puerto 3000,
lo reutiliza fuera de CI.

## Autenticación

- El `access` token vive solo en memoria.
- El `refresh` token viaja en la cookie `rm_refresh` (`HttpOnly`,
  `SameSite=Strict`, `Secure` fuera de desarrollo, `path=/api/auth/`). No se
  guarda en `localStorage`.
- Ante un `401`, un interceptor intenta refrescar una sola vez y reintenta la
  petición original.
- Varias peticiones simultáneas comparten una sola promesa de refresh para
  evitar rotaciones dobles.
- El refresh y el logout envían `X-Requested-With: XMLHttpRequest`.
- Si el refresh falla, se limpia la sesión local y se redirige a
  `/login?expirada=1`.
- Al cargar la app se restaura la sesión con el refresh y `/auth/perfil/` sin
  mostrar el login mientras tanto.

La autorización real siempre la aplica el backend. La matriz de permisos del
frontend (`src/auth/permisos.ts`) solo controla qué rutas y acciones se muestran.

## Roles y rutas

| Rol | Inicio tras login | Rutas principales |
| --- | --- | --- |
| Comprador | `/tienda` | `/catalogo`, `/carrito`, `/checkout`, `/mis-pedidos`, `/direcciones`, `/notificaciones`, `/perfil` |
| Vendedor | `/vendedor` | `/vendedor/verificacion`, `/vendedor/puestos`, `/vendedor/productos`, `/vendedor/pedidos`, `/vendedor/cupones`, `/vendedor/resenas` |
| Administrador | `/admin` | `/admin` (resumen), `/admin/usuarios`, `/admin/verificaciones`, `/admin/pedidos`, `/admin/puestos`, `/admin/productos`, `/admin/categorias`, `/admin/resenas`, `/admin/pagos`, `/admin/cupones`, `/admin/auditoria` |

El menú de los layouts se obtiene de `GET /api/auth/menu/`; los botones de pedido
se pintan desde `acciones_permitidas` del backend, no desde reglas locales.

Rutas protegidas:

- Sin sesión: redirección a `/login?redirect=<ruta original>`.
- Rol incorrecto: redirección a `/403`.

## Usuarios de demostración

Contraseña para todos: `RioMarket2026!`.

| Rol | Correo |
| --- | --- |
| Administrador | `admin@riomarket.test` |
| Vendedor | `carmen@riomarket.test` |
| Vendedor | `diego@riomarket.test` |
| Comprador | `luis@riomarket.test` |

Con `VITE_DEMO_MODE=true`, el login muestra botones que rellenan las
credenciales de comprador, vendedor y administrador.

## Flujo de compra

1. El comprador arma el carrito. Solo admite productos de un puesto.
2. En el checkout elige retiro o domicilio, una dirección guardada o una
   dirección manual, notas y un cupón opcional.
3. Al crear el pedido se abre el detalle para registrar el pago.
4. El vendedor confirma el pedido (el backend exige pago aprobado), lo pasa a
   preparación y lo entrega al domiciliario (en camino). El comprador confirma
   «Ya recibí mi pedido»; si no llega, reporta «No me ha llegado».
5. El administrador puede resolver la disputa marcando el pedido como entregado.
6. El comprador puede reseñar el pedido entregado.
7. Los pagos en efectivo los confirma el vendedor; los sandbox se aprueban o
   rechazan desde el detalle cuando el sandbox está habilitado.

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
│   ├── navigation/          # menú dinámico y fallback
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

- `npm test`: 18 pruebas de utilidades, interceptores HTTP (refresh compartido,
  reintento y pérdida de sesión), rutas protegidas, menú dinámico con fallback y
  modales de moderación de usuarios.
- `npm run test:e2e`: smoke de la landing, de `/tienda`, login y navegación al registro.
- `npm run lint`, `npm run typecheck` y `npm run build` también corren en CI.

## Limitaciones conocidas

- No se crean ni eliminan usuarios desde el panel: solo se cambia el rol o se
  suspende la cuenta. Tampoco hay cambio de contraseña.
- Si `GET /api/auth/menu/` falla, el menú cae a un conjunto mínimo (catálogo,
  carrito e ingreso) hasta que la API vuelva.
- El pago sandbox solo funciona si backend y frontend tienen habilitado el
  sandbox.
- Una dirección escrita manualmente en el checkout solo pasa a la libreta si se
  marca «Guardar esta dirección en mi libreta»; de lo contrario queda como
  snapshot del pedido.
- Las notificaciones por correo dependen de la configuración SMTP del backend.
- Algunas rutas del panel cargan varios componentes y Vite puede avisar del
  tamaño de algún chunk.

## Más documentación

- [Alcance del frontend](../docs/alcance-frontend.md)
- [README principal](../README.md)
- [Ejemplos de API](../docs/api-ejemplos.md)
- Swagger local: <http://127.0.0.1:8000/api/docs/>
