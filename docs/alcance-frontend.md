# Alcance y decisiones del frontend

Este documento conserva el encargo original con el que se construyó el frontend
de RioMarket y anota los cambios de autenticación aplicados después. El estado
actual y las limitaciones están en [`frontend/README.md`](../frontend/README.md).

---

Quiero que construyas el frontend completo de RioMarket, una app de compra y venta de productos locales en Riohacha (La Guajira, Colombia). El backend ya existe en el repositorio y ya consumimos endpoints. El nuevo frontend va en `frontend` y debe ser una SPA hecha con React, Vite y TypeScript, usando la API REST real del backend.

## Contexto

- El backend es Django REST Framework, con API en `http://127.0.0.1:8000/api/`.
- Ya hay autenticación JWT (access y refresh), catálogo, pedidos, pagos, direcciones, notificaciones, reseñas, cupones, verificación de vendedores y auditoría.
- Todo el frontend (comprador, vendedor y administrador) irá en un solo proyecto React. La separación por rol será por rutas y por el rol del usuario autenticado.
- La app debe funcionar de verdad contra el backend local y no solo verse bonita.
- Hay usuarios de prueba (`admin@riomarket.test`, `carmen@riomarket.test` y `diego@riomarket.test`), contraseña `RioMarket2026!`. Confirma en el backend cuáles son vendedores y cuál comprador.

## Reglas

- TypeScript estricto. Prohibido `any`.
- TanStack Query para estado del servidor y Axios para HTTP.
- El access token se guarda solo en memoria. El refresh token viaja en una cookie `HttpOnly` (`rm_refresh`); nunca se guarda en `localStorage` ni se muestra en pantalla.
- Axios con interceptores: añade el access; ante 401 intenta refrescar una sola vez y reintenta. Si el refresh falla, limpia sesión y redirige a `/login`. Implementa refresh compartido: varias peticiones simultáneas con 401 deben compartir una sola promesa de refresh.
- Rutas protegidas y protección por rol. Si no hay sesión, redirige a `/login?redirect=...`. Si el rol no tiene permiso, a `/403`.
- Valida formularios con React Hook Form + Zod. Muestra errores del backend mapeados por campo (`errors.campo[0]`).
- Todos los formularios deben manejar estados de carga, error y deshabilitado.
- El design debe ser coherente, responsive, accesible, con Tailwind. No uses componentes pesados de UI.
- Usa `Intl.NumberFormat('es-CO')` para moneda COP y fechas en `America/Bogota`.
- Las imágenes vienen del backend; si el backend devuelve URL relativa, conviértela con `VITE_API_URL`.
- Los tests deben poder correr en CI y no depender de un backend levantado.
- No inventes endpoints. Si el backend no expone algo, no lo implementes y anótalo en un README.

## Fases

### Fase 1: base
- `frontend/` con Vite + React + TS + Tailwind. Scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`.
- `.env` con `VITE_API_URL=http://127.0.0.1:8000`.
- Cliente HTTP (`src/lib/http.ts`) con interceptores, refresh compartido y logout.
- `SessionProvider` con estados `cargando`, `anonimo`, `autenticado`; restaura la sesión al cargar usando refresh y `/auth/perfil/`.
- `RutaProtegida` y matriz de permisos por rol en `src/auth/permisos.ts`.
- Layouts público y de panel. Tema claro/oscuro.

### Fase 2: auth y RBAC
- Login y registro. Registro permite comprador o vendedor.
- Redirección al inicio según rol tras login: comprador `/`, vendedor `/vendedor`, admin `/admin`.
- Logout. La sesión se restaura desde la cookie de refresh al cargar la app.
- Manejo de sesión expirada sin parpadeo.

### Fase 3: catálogo público
- Inicio con destacados, categorías y puestos.
- Catálogo con búsqueda, filtros por categoría y puesto, orden y paginación.
- Detalle de producto (agregar al carrito, stock, puesto).
- Detalle de puesto (datos, categorías, productos, reseñas).
- Carrito persistente en `localStorage`. Un carrito solo puede tener productos de un mismo puesto; si se agrega otro, pregunta antes de vaciar.
- Indicador de carrito en el header.

### Fase 4: comprador
- Checkout: elegir o crear dirección, notas, cupón de descuento, tipo de entrega (retiro/domicilio), resumen de totales.
- Crear pedido. Luego gestionar pago en el detalle del pedido.
- Mis pedidos con filtros por estado.
- Detalle de pedido con línea de tiempo de estado, ítems, entrega, pagos y acciones disponibles.
- Direcciones: CRUD, predeterminada.
- Notificaciones: listado, filtro no leídas, marcar leída/todas.
- Perfil: editar datos, verificación de vendedor si aplica, cerrar sesión.
- Reseñar pedidos entregados (estrellas y comentario).

### Fase 5: vendedor
- Dashboard: KPIs, verificación pendiente, pedidos pendientes, accesos rápidos.
- Verificación: subir cédula y foto (JPG/PNG/WebP, máx. 2 MB), ver estado, reenviar si fue rechazado.
- Puestos: CRUD, asignar/quitar categorías, lat/long si ofrece domicilio.
- Productos: CRUD, subir/eliminar imágenes, stock, precio, categorías del puesto.
- Pedidos: filtros, transiciones (confirmar, en preparación, enviar, entregar, cancelar), confirmar pago en efectivo.
- Cupones: CRUD de cupones de sus puestos.
- Reseñas: listado y respuesta.

### Fase 6: administrador
- Dashboard con métricas globales.
- Verificaciones de vendedores: aprobar o rechazar con motivo.
- Pagos: listado global, reembolsar, anular, simular en sandbox.
- Cupones: CRUD global o por puesto.
- Auditoría: listado paginado con usuario, acción, entidad, IP y fecha.
- Pedidos: listado global y acceso al detalle.
- Usuarios y puestos: solo lo que exponga la API; documenta lo que falte.

### Fase 7: pulido
- Modo demo en login con botones que rellenan las credenciales de prueba (comprador, vendedor y admin), activado con `VITE_DEMO_MODE=true`.
- Carga diferida de rutas con `React.lazy` y `Suspense`.
- Tests unitarios de utilidades, interceptores (refresh compartido, reintento, pérdida de sesión) y rutas protegidas (redirect a login y a `/403`).
- Smoke test con Playwright de la app (login público y navegación básica).
- Job de frontend en CI: `npm ci`, `lint`, `typecheck`, `test`, `build`.
- README del frontend y mención en el README principal.
- Documentar limitaciones: endpoints que falten, RBAC de UI (el backend es la autoridad) y sandbox de pagos.

## Criterios de terminado

- `npm run build` y `npm run typecheck` pasan.
- `npm run lint` sin errores.
- Tests de interceptor y rutas protegidas pasan.
- Flujo completo contra backend local: registro/login, catálogo, carrito, pedido, pago, confirmación del vendedor, entrega, reseña.
- Paneles de vendedor y admin funcionan con sus datos reales.
- README con instalación, variables, estructura, roles, usuarios demo y limitaciones.
