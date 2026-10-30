# Sistema de diseño de RioMarket

Interfaz densa de marketplace: encabezado turquesa, tarjetas blancas sobre fondo gris frío, acción en coral.
La fuente de verdad fueron los tres mocks aprobados (inicio escritorio, inicio celular, producto).

## Tokens (`frontend/tailwind.config.js`)

| Token | Valor | Uso |
| --- | --- | --- |
| `brand-600` | `#00626D` | Encabezado, enlaces, estados activos. La escala `brand-50..950` es turquesa |
| `accion` / `accion-hover` | `#CF3F1B` / `#B53414` | Comprar, agregar, confirmar (`.btn-primary`) |
| `amarillo` | `#FFD166` | Detalles: «Market» del logo, contadores, foco de la búsqueda |
| `tinta` | `#1B2A33` | Texto principal |
| `slate-*` | escala fría; `500 = #566973`, `200 = #DDE4E8` | Texto secundario y bordes. En oscuro, `900` es la tarjeta y `950` la página |
| `fondo` | `#EDF1F3` | Fondo de página |
| `exito`, `azul`, `estrella`, `pie` | `#0B7A3E`, `#0D5C8A`, `#9A5B00`, `#17313B` | Domicilio/éxito, bloque azul, calificación, pie |

`estrella` se oscureció de `#B26A00` (mock) a `#9A5B00` porque el original daba 4,2:1 sobre blanco; ahora 5,4:1.
`sand` ya no existe. Radios: `lg` 8 px, `xl`/`2xl` 10 px. Sin degradados, vidrio ni manchas; sombras solo al pasar el cursor (`shadow-hover`) o en elementos flotantes (`shadow-flota`, `shadow-menu`).

## Tipografía

Figtree variable autoalojada (`@fontsource-variable/figtree`, solo el subconjunto latino, 20 kB, sin CDN). Base 15 px.
Precios con `.precio` (negrita, cifras tabulares).

## Clases de componente (`src/index.css`)

`.btn`, `.btn-primary` (coral), `.btn-secondary`, `.btn-marca` (turquesa suave), `.btn-ghost`, `.btn-danger`, `.input`, `.label`,
`.card`, `.card-hover`, `.badge`, `.link`, `.skeleton` (con brillo), `.table*` (hover de fila), `.acto-encabezado`, `.pie-enlace`.
Objetivos táctiles de 44 px en móvil (`min-h-[44px]`, 40 px desde `md`). Foco visible: anillo amarillo de 3 px.

## Componentes compartidos

- `PublicLayout`: encabezado turquesa con buscador (con categoría), pedidos, carrito; barra inferior de 5 pestañas en celular
  (Inicio, Catálogo, Carrito, Pedidos o Panel según permisos, Cuenta, que abre una hoja). `PanelLayout`: barra superior de marca y menú lateral con iconos e ítem activo marcado.
- `Destacados`: carrusel con puestos reales (portada si existe; color sólido si no; 0 o 1 elementos se ven bien), barra de progreso,
  pausa con el cursor o el foco, entrada escalonada del texto. Sin autoavance con `prefers-reduced-motion`.
- `ProductoCard`: foto cuadrada, «Quedan N» solo con stock de 1 a 5, calificación del puesto solo si existe, domicilio, botón `+` redondo en celular.
- `iconos.tsx`: 8 iconos de categoría propios y uno genérico; la reserva sin foto usa el icono de la categoría sobre gris.
- `PuestoCard` / `LogoPuesto`: portada, logo o iniciales sobre color propio.
- `Modal` (hoja inferior en celular), `Toast` (`role="status"`, `aria-live`), `Estado*` (vacíos útiles, esqueletos con la forma real), `EtiquetaEstado` (chips consistentes).
- `PasosPedido`: seguimiento con iconos y barra animada; el cancelado se muestra como bloque rojo aparte.

## Animaciones (sin dependencias)

Vuelo de la miniatura al carrito (`volarAlCarrito`) con rebote del contador (`animate-pop`) y toast; progreso del carrusel; elevación y zoom de tarjetas;
rebote de categorías; zoom de foto en producto; barras (`animate-grow`); esqueletos; transición entre rutas (`.ruta-entra`); apertura de modales y menús.
Todo se desactiva con `prefers-reduced-motion` (regla global en `index.css` y comprobación en `volarAlCarrito`).

## Tema oscuro

Se conserva el botón. Fondo `#0F1A20`, tarjetas `#1B2A33`, bordes `#26363E`, enlaces `brand-300`. Contrastes medidos ≥ 4,9:1.

## Datos y voz

Solo se muestran datos que la API entrega. Las reseñas son del puesto y se etiquetan así. No hay promesas de «fresco», «del día», «pago seguro» ni «gratis».
Se añadieron al listado de productos los campos de solo lectura `puesto_nombre`, `puesto_ofrece_domicilio` y `puesto_calificacion` (sin consultas extra).
