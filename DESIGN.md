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
`sand` ya no existe. Radios: `lg` 8 px, `xl`/`2xl` 10 px. Sin vidrio ni manchas decorativas; sombras solo al pasar el cursor (`shadow-hover`) o en elementos flotantes (`shadow-flota`, `shadow-menu`). Los degradados y las texturas existen, pero salen de la marca (ver «Detalles de marca»).

## Marca

El símbolo es un **toldo de puesto de mercado** (franjas coral y crema con el borde festoneado) sobre **dos olas de río**,
el Ranchería de Riohacha. Se lee de 96 px a 16 px. La palabra sigue siendo «Rio» + «Market» en Figtree 800 con seguimiento −0,03 em.

| Pieza | Archivo | Uso |
| --- | --- | --- |
| Símbolo con cuadro turquesa | `public/brand/marca.svg` | Superficies claras (tarjetas, landing, login) |
| Símbolo sin cuadro | `public/brand/marca-sin-fondo.svg` | Sobre turquesa u oscuro (encabezados, pie) |
| Logo horizontal | `public/brand/logo-horizontal.svg` | Documentos y presentaciones sobre fondo claro |
| Logo horizontal sobre oscuro | `public/brand/logo-horizontal-sobre-oscuro.svg` | Sobre turquesa u oscuro |
| Favicon | `public/favicon.svg` | Pestaña: toldo de tres paneles y una ola, más grueso para que aguante 16 px |
| Íconos de la app y tarjeta para redes | `public/icons/*.png`, `public/og-riomarket.png` | PWA, iOS y vista previa al compartir |

Colores del símbolo: coral `#E4502A` (el de acción aclarado para separarse del turquesa), crema `#FFF4DC`, amarillo `#FFD166`
y agua `#BFE3E7` sobre `#00626D`. Las letras de los SVG están convertidas en trazos: no dependen de ninguna fuente.
En la app se usa `components/layout/Logo.tsx` (con `MarcaSvg.tsx`, la misma geometría; una prueba comprueba que coinciden).

Se regeneran con `python scripts/generar_logo.py` (necesita `pip install fonttools brotli`) y `node frontend/scripts/exportar-marca.mjs`.
El ícono «maskable» respeta la zona segura de Android (el símbolo ocupa el 74 % central).

## Detalles de marca

Los dos motivos del logo (las olas y el toldo festoneado) se usan como textura y como borde, siempre en SVG o CSS en línea
(la CSP no permite imágenes externas) y siempre `aria-hidden`. Viven en `components/ui/Decoracion.tsx`:

| Pieza | Dónde |
| --- | --- |
| `PatronOlas` (filas de olas con `currentColor`, se atenúa con `opacity-*` y se difumina con `desvanecer` o `desvanecerEnMancha`) | Carrusel de destacados, panel izquierdo de login y registro, cabecera de página (`EncabezadoPagina`), estados vacíos, portada del puesto sin foto |
| `OlasInferiores` (dos siluetas que se mecen; `animate-deriva`) | Borde inferior del carrusel y de la portada del puesto (en el color de la tarjeta, funde la foto con el contenido) |
| `BordeFestoneado` (medias lunas del toldo) | Borde superior del pie de página |

Además: fondo de página con un velo turquesa (arriba a la izquierda) y otro amarillo (arriba a la derecha) solo en claro; tarjetas
con un reflejo en el borde superior; símbolo del logo como marca de agua en el panel de login.

**Carrusel de destacados.** Cada diapositiva lleva el color del diseño con un degradado en diagonal y un brillo detrás de la foto. La foto tiene el
borde izquierdo inclinado con una banda translúcida detrás. Con texto blanco el lado del texto se oscurece un 8 % para dejar margen al contraste;
`color-mix` queda de respaldo en el color sólido. El texto se limita al espacio libre a la izquierda de la foto
(`calc(52vw - 4.5rem)` en tablet, `calc(42vw - 4.5rem)` desde `lg`) y la flecha izquierda mide 36 px para no tapar la primera letra.
El contraste real (píxeles detrás del texto) se midió en cinco anchos y las cuatro diapositivas: mínimo 5,1:1.

## Tipografía

Figtree variable autoalojada (`@fontsource-variable/figtree`, solo el subconjunto latino, 20 kB, sin CDN). Base 15 px.
Precios con `.precio` (negrita, cifras tabulares).

## Clases de componente (`src/index.css`)

`.btn`, `.btn-primary` (coral), `.btn-secondary`, `.btn-marca` (turquesa suave), `.btn-ghost`, `.btn-danger`, `.input`, `.label`,
`.card`, `.card-hover`, `.badge`, `.link`, `.skeleton` (con brillo), `.table*` (hover de fila), `.acto-encabezado`, `.pie-enlace`.
Objetivos táctiles de 44 px en móvil (`min-h-[44px]`, 40 px desde `md`). Foco visible: anillo amarillo de 3 px.

## Componentes compartidos

- `PublicLayout`: encabezado turquesa con buscador (con categoría), pedidos, carrito; barra inferior de 5 pestañas en celular
  (Tienda, Catálogo, Carrito, Pedidos o Panel según permisos, Cuenta, que abre una hoja). `PanelLayout`: barra superior de marca y menú lateral con iconos e ítem activo marcado.
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

## Landing (`/`) y tienda (`/tienda`)

`/` es una landing propia (`pages/Landing.tsx` + `Landing.module.css`, chunk aparte de ~17 kB) con su cabecera y su pie; no usa `PublicLayout`. La tienda (`Inicio`) vive en `/tienda`
y `/inicio` redirige allí. Con sesión iniciada, `/` redirige a `inicioPorRol` (comprador `/tienda`, vendedor `/vendedor`, administrador `/admin`); mientras la sesión carga se muestra el estado de carga.
Traducida de la maqueta aprobada: titular grande, ticket de pedido que se «imprime» y recorre los 5 estados (sello «Lo recibí»), franja turquesa, línea de seguimiento con `animation-timeline: view()`
(quieta y completa sin soporte), interruptor comprar/vender (`role="tablist"`, flechas), pasillo de puestos reales de la API (hasta 4, esqueletos, aviso si falla o no hay), reglas sobre fondo papel, cierre, pie y barra fija en celular.
Paleta propia y clara aunque la tienda esté en oscuro (CSS Modules, `color-scheme: light`). Con `prefers-reduced-motion` todo queda quieto y completo. Fotos en `public/landing/` (con crédito en `/creditos-fotos`).
