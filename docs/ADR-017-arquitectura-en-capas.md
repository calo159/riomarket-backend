# ADR-017: arquitectura en capas y reglas de dependencia

## Contexto

Con el crecimiento del proyecto las apps se fueron importando unas a otras sin una dirección clara:

- `common`, el núcleo que todas usan, dependía de **casi todo el dominio** (comandos de datos de demostración,
  `seo.py` con el catálogo y los permisos por rol con `accounts`).
- `rbac`, la base de la autorización, dependía de `orders`, `payments`, `notifications` y `accounts` solo para
  calcular los contadores («insignias») del menú.
- Para esquivar los ciclos que eso creaba había **35 imports dentro de funciones** («imports diferidos»), que
  esconden el problema: el código arranca, pero nadie sabe en qué orden depende de qué.
- En el frontend, `lib/` (utilidades) importaba de `pages/`, y `auth/` y `navigation/` se importaban mutuamente
  (la sesión invalida el menú; el menú lee la sesión).

Un ciclo no es solo estética: impide leer, probar o reutilizar una pieza sin cargar las demás, y cada import
diferido es un `ImportError` que aparece en ejecución y no al arrancar.

## Decisión

### Backend: las apps forman capas y solo dependen hacia abajo

| Nivel | Apps | Rol |
| --- | --- | --- |
| 0 | `common` | Núcleo: excepciones, paginación, seguridad, almacenamiento, correo. **No conoce el dominio** |
| 1 | `rbac` | Roles, recursos y menú. No conoce el dominio |
| 2 | `accounts`, `audit`, `notifications` | Usuarios y permisos por rol; registro de acciones; avisos |
| 3 | `addresses`, `catalog` | Direcciones; puestos y productos |
| 4 | `promotions`, `sitio` | Cupones; entrega de la web, `robots.txt` y `sitemap.xml` |
| 5 | `orders`, `payments` | El proceso de compra (ver la excepción abajo) |
| 6 | `reviews` | Reseñas de pedidos entregados |
| 7 | `administration` | Panel de administración |
| 8 | `demo` | Comandos de datos de demostración. Nada depende de ella |

Una app importa solo de apps de nivel **menor**. Los imports entre apps van al inicio del archivo; la única
excepción son los ganchos de arranque en `AppConfig.ready`.

**Cuando una app de nivel bajo necesita algo de una de nivel alto, se invierte con un punto de extensión** en vez
de importar hacia arriba. La app baja define el mecanismo; la alta se registra al arrancar:

- **Insignias del menú.** `rbac.menu.registrar_insignia(codigo, calculo)`. `orders`, `payments`, `notifications`
  y `accounts` registran las suyas en `insignias.py` desde su `ready()`.
- **Anotaciones del catálogo.** `catalog.anotaciones.registrar_anotador(nombre, funcion)`. `reviews` registra la
  reputación de los puestos y la calificación del puesto de cada producto. Sin anotador, la consulta queda igual.
- **Señal de roles.** `rbac.signals` se engancha al modelo de usuario por `settings.AUTH_USER_MODEL` (una cadena),
  no importando `accounts`.

Movimientos de código para que cada pieza viva en su nivel:

| Antes | Ahora | Por qué |
| --- | --- | --- |
| `common/permissions.py` | `accounts/permissions.py` (junto al permiso anti-CSRF) | Los permisos por rol conocen `Usuario` y `Vendedor` |
| `common/management/commands/seed_*` | `demo/` | Los comandos de datos conocen todo el dominio. Los nombres no cambian |
| `common/seo.py` y las vistas que entregan la SPA | `sitio/` | Necesitan el catálogo para el sitemap y las metaetiquetas |

**Única dependencia mutua aceptada: `orders` ↔ `payments`.** Un pedido y su cobro son el mismo proceso: confirmar
exige un pago aprobado, cancelar lo reembolsa, entregar en efectivo cierra el cobro; y el pago pertenece a un
pedido. `payments` importa solo los **modelos** de `orders`; `orders` importa modelos y servicios de `payments`.
No hay ciclo de Python (todo se importa al inicio y arranca). Separarlos del todo exigiría cuatro «puertos» que
añaden código sin quitar acoplamiento real.

### Frontend: las carpetas forman capas

| Nivel | Carpeta | Contenido |
| --- | --- | --- |
| 0 | `lib/` | Utilidades puras: formato, errores, claves de caché, tipos |
| 1 | `api/` | Peticiones, definiciones de consultas (`consultas.ts`) y precarga (`precarga.ts`) |
| 2 | `auth/` | Sesión y tokens |
| 3 | `navigation/`, `cart/` | Menú y permisos del usuario; carrito |
| 4 | `components/` | Piezas de interfaz (incluye `RutaProtegida`, que reúne sesión, permisos y pantallas de estado) |
| 5 | `pages/` | Pantallas |

Cambios: `pages/inicio/consultas.ts` y `lib/precarga.ts` pasan a `api/` (son datos, no pantalla ni utilidad);
`invalidarMenu` pasa a `lib/` (y `navigation/useMenu` lo reexporta) para que la sesión no importe `navigation`;
`auth/RutaProtegida` pasa a `components/`.

### Cómo se hace cumplir

- **`tests/test_arquitectura.py`** (backend) y **`frontend/src/arquitectura.test.ts`** leen los `import` y fallan con
  un mensaje que dice qué dependencia sobra: importar hacia arriba o entre pares, un import escondido dentro de
  una función, que `common` o `rbac` conozcan el dominio, o una app/carpeta nueva sin nivel declarado. Declarar el
  nivel de una pieza nueva es la decisión de diseño que se quiere forzar.
- Se comprobó que fallan: se introdujeron a propósito cada tipo de violación y la prueba las detectó.

## Consecuencias

- El grafo de dependencias es acíclico (salvo `orders` ↔ `payments`) y se puede leer de abajo hacia arriba.
- `common` y `rbac` se pueden reutilizar o probar sin cargar el negocio; los imports diferidos pasaron de 35 a 1.
- **Costo:** los puntos de extensión son registros en tiempo de arranque, menos evidentes que una llamada directa.
  Se mitiga con pruebas que comprueban que cada app registró lo suyo (`rbac/tests/test_insignias.py`,
  `catalog/tests/test_anotaciones.py`) y con el docstring de cada mecanismo.
- **No se hizo (y es trabajo futuro):** dividir los archivos más grandes —`orders/services.py` (~820 líneas),
  `catalog/services.py` y, en el frontend, `Checkout.tsx`, `Landing.tsx` y las pantallas de administración (450–550
  líneas)—. Son un problema de tamaño, no de dependencias, y conviene hacerlo con una prueba de comportamiento
  que cubra cada pantalla antes de partirla.
