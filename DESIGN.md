# Sistema de diseño de RioMarket

Interfaz densa de marketplace con una idea de color propia: **las cartulinas de precio de un puesto de mercado**. Encabezado turquesa, tarjetas blancas sobre «sal», bandas de color de ancho completo, acción en coral, y un color de cartulina por categoría. Sin degradados ni brillos.
La fuente de verdad fueron los tres mocks aprobados (inicio escritorio, inicio celular, producto).

## Tokens (`frontend/tailwind.config.js`)

| Token | Valor | Uso |
| --- | --- | --- |
| `brand-600` | `#00626D` | Encabezado, enlaces, estados activos. La escala `brand-50..950` es turquesa |
| `accion` / `accion-hover` | `#CF3F1B` / `#B53414` | Comprar, agregar, confirmar (`.btn-primary`) |
| `amarillo` | `#FFD166` | Detalles: «Market» del logo, contadores, foco de la búsqueda |
| `tinta` | `#14262A` | Texto principal (tinta marina, con un hilo de verde) |
| `slate-*` | `50-300` cálidos (`200 = #E4D9C3`, bordes y superficies); `400-950` fríos (`500 = #566973`) | Texto secundario y bordes. En oscuro, `900` es la tarjeta y `950` la página |
| `fondo` | `#F4F6F2` | Fondo de página: «sal», el blanco verdoso de las salinas. Ni gris frío (`#EDF1F3`, lo pálido) ni crema cálido (`#F4EBDA`, la apariencia de toda interfaz «cálida»): el color lo ponen las cartulinas y las bandas. `papel` y `crema` quedan solo para la marca y el logo |
| `exito`, `azul`, `estrella`, `pie` | `#0B7A3E`, `#0D5C8A`, `#9A5B00`, `#17313B` | Domicilio/éxito, bloque azul, calificación, pie |

`estrella` se oscureció de `#B26A00` (mock) a `#9A5B00` porque el original daba 4,2:1 sobre blanco; ahora 5,4:1.
`sand` ya no existe. Radios: `lg` 8 px, `xl`/`2xl` 10 px. Sin vidrio ni manchas decorativas. En reposo la tarjeta se separa del papel con borde cálido y una sombra corta (`shadow-reposo`); sube con `shadow-hover` al pasar el cursor y los elementos flotantes usan `shadow-flota` y `shadow-menu`. Los degradados y las texturas existen, pero salen de la marca (ver «Detalles de marca»).

**Cartulinas de precio (dirección de color).** Un puesto de mercado marca cada producto con una cartulina de color y el precio a mano. Aquí el color de esa cartulina es el de la **categoría**, así el color significa algo en vez de decorar (`components/cartulina.ts`):

| Categoría | Cartulina | Fondo | Tinta |
| --- | --- | --- | --- |
| Arepas | maíz | `#F2E35A` | `#14262A` |
| Frutas y verduras | limón | `#BFE23A` | `#14262A` |
| Pescados y mariscos | mar | `#5FE3D0` | `#14262A` |
| Comida | ají | `#D9303A` | `#FFFFFF` |
| Dulces típicos | guayaba | `#FF7FA5` | `#14262A` |
| Bebidas | mango | `#FFA21F` | `#14262A` |
| Artesanías | corozo | `#7C3AA8` | `#FFFFFF` |
| Ropa | índigo | `#4D5BD8` | `#FFFFFF` |
| Otra | sal | `#DCE5E3` | `#14262A` |

Los tonos están separados a propósito de los que significan otra cosa: el ají es un rojo frío lejos del coral del botón de comprar, el mar es más verdoso que el turquesa de la marca y el maíz se distingue del mango. Donde se ven: la **etiqueta del precio** de cada producto (`.etiqueta-precio`: con la unidad escrita dentro, un hueco para el cordel y una inclinación de ±2° que cambia de una a otra; en celular la unidad va abreviada), la **fila de categorías** (cada una es una cartulina rectangular de su color con la foto del producto típico asomando, ya no círculos en una caja blanca) y los chips de categoría de los puestos. El botón de comprar de cada tarjeta es una pastilla coral compacta («+ Agregar»), no un bloque a todo lo ancho: diez botones enteros por pantalla pesaban más que el producto. Una prueba comprueba el contraste AA de cada par y que no se repita ningún color. Son colores de papel fluorescente: sirven igual de día y de noche.

**Claro y oscuro.** De día, la sal con tarjetas blancas, bandas turquesa y amarilla de ancho completo y botones de compra coral planos. De noche, la «noche de mercado»: los neutros del 600 al 950 son un verde marino muy oscuro (`#0A1D21` la página, `#133136` la tarjeta, `#214449` el borde) en lugar del azul-gris genérico, y las cartulinas brillan sobre él como bajo el bombillo de un puesto. El oscuro no es el claro invertido: el encabezado y los paneles pasan de turquesa a `slate-900`, la banda de puestos sigue siendo turquesa (`brand-700`), los amarillos bajan a `#C99A2E` para no deslumbrar y «Cómo funciona» lleva una franja amarilla arriba.

**Ritmo de color de la tienda.** El color no se queda arriba: tras el carrusel y las categorías, «Puestos de Riohacha» es una banda turquesa de ancho completo (`brand-600`, olas muy tenues) y «Cómo funciona» una banda amarilla. Contraste medido (AA): tinta sobre sal 14,4:1, texto secundario `#4F6663` 5,7:1, blanco sobre turquesa 7,1:1 y sobre coral 4,8:1. La tarjeta blanca contra la sal se separa por borde y sombra de reposo, no por contraste de valor.

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

**Carrusel de destacados.** Las diapositivas rotan turquesa, amarillo, aguamarina y coral (ya no hay azul: chocaba con el turquesa del encabezado). Cada una lleva su color con un degradado en diagonal y un brillo detrás de la foto. La foto tiene el
borde izquierdo inclinado con una banda translúcida detrás. Con texto blanco el lado del texto se oscurece un 8 % para dejar margen al contraste;
`color-mix` queda de respaldo en el color sólido. El texto se limita al espacio libre a la izquierda de la foto
(`calc(52vw - 4.5rem)` en tablet, `calc(42vw - 4.5rem)` desde `lg`) y la flecha izquierda mide 36 px para no tapar la primera letra.
El contraste real (píxeles detrás del texto) se midió en cinco anchos y las cuatro diapositivas: mínimo 5,1:1.

## Superficies del navegador

Lo que el navegador dibuja por su cuenta también está tematizado (`index.css`, capa base): `::selection` amarillo `#FFD166` con texto tinta, `caret-color` y `accent-color` turquesa (`#7DB6BC` en oscuro) y `scrollbar-color` en el tono del papel. Las calificaciones usan estrellas llenas, medias y vacías (`Estrellas`): un 4,5 son cuatro y media.

## Tipografía

Figtree variable autoalojada (`@fontsource-variable/figtree`, solo el subconjunto latino, 20 kB, sin CDN). Base 15 px.
Precios con `.precio` (peso 800, cifras tabulares). Los títulos de sección de la tienda usan `TituloSeccion` (`.titulo-seccion`): 26 px en celular y 34 px desde `md`, peso 900, seguimiento −0,03 em, con la última palabra en turquesa (`.resalta`; en las bandas de color, `titulo-seccion-claro`: texto blanco y resalte amarillo). Es la escala de la landing en pequeño.

## Clases de componente (`src/index.css`)

`.btn`, `.btn-primary` (coral), `.btn-secondary`, `.btn-marca` (turquesa suave), `.btn-ghost`, `.btn-danger`, `.input`, `.label`,
`.card`, `.card-hover`, `.badge`, `.link`, `.skeleton` (con brillo), `.table*` (hover de fila), `.acto-encabezado`, `.pie-enlace`.
Objetivos táctiles de 44 px en móvil (`min-h-[44px]`, 40 px desde `md`). Foco visible: anillo amarillo de 3 px.

## Componentes compartidos

- `PublicLayout`: encabezado turquesa con buscador (con categoría), pedidos, carrito; barra inferior de 5 pestañas en celular
  (Tienda, Catálogo, Carrito, Pedidos o Panel según permisos, Cuenta, que abre una hoja). `PanelLayout`: barra superior de marca y menú lateral con iconos e ítem activo marcado.
- `Destacados`: carrusel con puestos reales (portada si existe; color sólido si no; 0 o 1 elementos se ven bien), barra de progreso,
  pausa con el cursor o el foco, entrada escalonada del texto. Sin autoavance con `prefers-reduced-motion`.
- `ProductoCard`: foto cuadrada, «Quedan N» solo con stock de 1 a 5, calificación del puesto solo si existe, «Solo retiro en el puesto» únicamente cuando el puesto no hace domicilio (lo normal no se repite), botón `+` redondo en celular y coral relleno en escritorio. Con `ocultarPuesto` (página del puesto) no repite nombre, calificación ni entrega. `AvisoUnPuesto` recuerda de qué puesto es el pedido en curso y que cada pedido es de uno solo.
- `iconos.tsx`: 8 iconos de categoría propios y uno genérico; la reserva sin foto usa el icono de la categoría sobre gris.
- `PuestoCard` / `LogoPuesto`: portada, logo o iniciales sobre color propio.
- `Modal` (hoja inferior en celular), `Toast` (`role="status"`, `aria-live`), `Estado*` (vacíos útiles, esqueletos con la forma real), `EtiquetaEstado` (chips consistentes).
- `PasosPedido`: seguimiento con iconos y barra animada; el cancelado se muestra como bloque rojo aparte.

## Animaciones (sin dependencias)

**Momento de marca de la tienda:** al cargar, las categorías suben escalonadas (`.entra-medallas`, `--i` con `lugar()`); al hacer scroll, el título y cada producto de un estante entran escalonados con `.rv` (el bloque ya no aparece entero) y la banda turquesa de puestos está siempre visible mientras sus tarjetas entran. Al agregar, el icono de confirmación hace `pop`.

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
