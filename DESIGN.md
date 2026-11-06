# Sistema de diseño de RioMarket

Marketplace sobrio y profesional, con la vara de Apple, Airbnb y Etsy: foto grande, tarjetas sin marco, tipografía cuidada y animación discreta. Encabezado turquesa, neutros «sal», coral solo para comprar. Sin degradados, brillos ni colores vivos.
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

**Dirección: sobrio y profesional.** La vara de calidad es Apple, Airbnb y Etsy: foto grande, tarjetas sin marco, tipografía cuidada y animación discreta. Lo que no se hace, porque delata «hecho por IA» o plantilla: colores vivos en etiquetas y bandas (se probaron y se descartaron las cartulinas de caramelo y el crema con coral), degradados y brillos en botones y encabezados, títulos bicolor repetidos en cada sección, tres iconos en círculo con título y frase gris, adornos que no informan (muescas, patrones de olas) y diez botones coral idénticos por pantalla.

**Uso del color.** Cada color tiene un trabajo: el **turquesa** `#00626D` es la marca y la estructura (encabezado, escaparate, enlaces); el **coral** `#CF3F1B` es la acción de comprar (el botón «Comprar ahora», el de buscar y el «+» al pasar el cursor); el **amarillo** `#FFD166` aparece una sola vez, en la palabra destacada del titular del escaparate y en la marca; el resto son neutros «sal». La categoría de un producto se marca con un **punto de color apagado** junto al nombre (`components/tonoCategoria.ts`: maíz, hoja, mar, ají, guayaba, mango, corozo, añil; misma luminosidad y poca saturación, con contraste AA y versión oscura, y lo comprueba `tonoCategoria.test.ts`); nunca con bloques de color.

**Tarjetas.** Sin marco: la foto es la tarjeta (cuadrada, radio 12), el precio va en negrita y la unidad en gris, el nombre en peso 500 y el puesto con su calificación en pequeño. La acción de comprar es un solo botón redondo blanco sobre la foto que se vuelve coral al pasar el cursor y verde al agregar (en celular, 40 px). La tarjeta de **puesto** es una foto 3:2 y tres líneas (calificación y entrega, dirección, descripción), con sus categorías como texto con punto de color. La **ficha de producto** es plana: foto a la izquierda y un único panel de compra que se queda fijo al desplazarse; la descripción y las reseñas se separan con espacio y una línea de 1 px, no con cajas.

**Claro y oscuro.** De día, neutros «sal» y blanco. De noche, la «noche de mercado»: los neutros del 600 al 950 son un verde marino muy oscuro (`#0A1D21` la página, `#133136` la tarjeta, `#214449` el borde) en lugar del azul-gris genérico, y el escaparate se separa de la página con `#0B3A3F`. El oscuro no es el claro invertido: el encabezado y los paneles pasan de turquesa a `slate-900`. Contraste medido (AA): tinta sobre sal 14,4:1, texto secundario `#4F6663` 5,7:1, blanco sobre turquesa 7,1:1 y sobre coral 4,8:1.

**Ritmo de la tienda.** Un solo fondo y el espacio separa las secciones (sin bandas de color ni líneas): escaparate, categorías en círculos con foto, estantes con «Ver todos ›» a la derecha, puestos y una sola frase que explica cómo funciona. Los títulos de sección son de un solo color (24 px en celular y 28 px desde `md`, peso 700).

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
| `PatronOlas` (filas de olas con `currentColor`, se atenúa con `opacity-*` y se difumina con `desvanecer` o `desvanecerEnMancha`) | Primer pliegue (escaparate), panel izquierdo de login y registro, cabecera de página (`EncabezadoPagina`), estados vacíos, portada del puesto sin foto |
| `OlasInferiores` (dos siluetas que se mecen; `animate-deriva`) | Borde inferior de la portada del puesto (en el color de la tarjeta, funde la foto con el contenido) |
| `BordeFestoneado` (medias lunas del toldo) | Borde superior del pie de página |

Además: fondo de página con un velo turquesa (arriba a la izquierda) y otro amarillo (arriba a la derecha) solo en claro; tarjetas
con un reflejo en el borde superior; símbolo del logo como marca de agua en el panel de login.

**Primer pliegue: el escaparate (`Escaparate`).** Reemplaza al carrusel de destacados, que era la plantilla de marketplace más repetida. Es fijo: un titular grande («Compra directo en los puestos de **Riohacha**», peso 900, −0,04 em, la última palabra en amarillo), dos acciones («Ver el catálogo» en coral y «Conocer los puestos» en contorno) y, a la derecha, un **puesto con toldo**: el toldo es el símbolo del logo en una banda fina (franjas coral `#E4502A` y crema `#FFF4DC`, borde festoneado, dibujado en SVG, se despliega desde arriba al cargar). Debajo del toldo va la portada del puesto con portada mejor calificado, y sobre ella un **ticket** de papel: es el pedido en curso del comprador con sesión (puesto, estado, total, «Seguir mi pedido») o, si no tiene uno, un puesto real para empezar (calificación, domicilio, «Ver el puesto»). Es la idea del ticket de la landing, ahora con datos. La foto es la del puesto del pedido si lo hay. Fondo turquesa en claro y `#0B3A3F` en oscuro. Se quitaron además las tres tarjetas de «accesos rápidos» y los dos destacados repetidos, que decían lo mismo que el titular y la banda de puestos.

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
- `Escaparate`: primer pliegue fijo de la tienda (titular, acciones, toldo y ticket); ver «Primer pliegue» arriba. El ticket usa el pedido sin terminar del comprador (`pedidos.activoDelComprador`) o un puesto real.
- `ProductoCard`: foto cuadrada, «Quedan N» solo con stock de 1 a 5, calificación del puesto solo si existe, «Solo retiro en el puesto» únicamente cuando el puesto no hace domicilio (lo normal no se repite), botón `+` redondo en celular y coral relleno en escritorio. Con `ocultarPuesto` (página del puesto) no repite nombre, calificación ni entrega. `AvisoUnPuesto` recuerda de qué puesto es el pedido en curso y que cada pedido es de uno solo.
- Paneles (`PanelVendedor`, `PanelAdmin`, `TarjetasVentas`): **un dato principal y los demás en una franja**, nunca filas de tarjetas iguales con icono teñido. Vendedor: «Ingresos aprobados» grande, los pedidos por atender como aviso turquesa solo si hay alguno, la semana día por día con el valor sobre la barra. Administración: «Requiere atención» con el total en ámbar y los asuntos con algo primero; en cero, «Todo al día» discreto. Las secciones de abajo se alinean arriba (`self-start`) y entran con `Revela`/`rv`.
- `iconos.tsx`: 8 iconos de categoría propios y uno genérico; la reserva sin foto usa el icono de la categoría sobre gris.
- `PuestoCard` / `LogoPuesto`: portada, logo o iniciales sobre color propio.
- `Modal` (hoja inferior en celular), `Toast` (`role="status"`, `aria-live`), `Estado*` (vacíos útiles, esqueletos con la forma real), `EtiquetaEstado` (chips consistentes).
- `PasosPedido`: seguimiento con iconos y barra animada; el cancelado se muestra como bloque rojo aparte.

## Animaciones (sin dependencias)

**Momento central: la coreografía del escaparate** (`Escaparate`, ~1,3 s, una sola vez al cargar). El titular sube **palabra por palabra** desde una máscara (`.palabra`); el toldo se despliega desde arriba (`.toldo-desplega`); la foto se descubre de arriba abajo con un recorte (`.foto-entra`) y se asienta desde un zoom de 1,14 (`.foto-entra img`); la bajada y las acciones aparecen con un retraso (`.hero-aparece`, `--retraso`); el ticket sube al final (`.ticket-entra`); y por último las categorías suben escalonadas (`.entra-medallas`, a partir de 1,1 s). Con scroll, la columna de la foto se desliza un poco más lenta que la página (`.foto-flota`, `animation-timeline: scroll()`, solo donde el navegador lo soporta). Más abajo, el título y cada producto de un estante entran escalonados al llegar (`.rv`: 26 px y 0,85 s, 90 ms entre uno y otro, tope de 5). Fotos de producto y de puesto: se elevan 4 px con sombra al pasar el cursor.

Vuelo de la miniatura al carrito (`volarAlCarrito`) con rebote del contador (`animate-pop`) y toast; el toldo que se despliega al cargar; elevación y zoom de tarjetas;
zoom de foto en producto; barras (`animate-grow`); esqueletos; transición entre rutas (`.ruta-entra`); apertura de modales y menús.
Con `prefers-reduced-motion` desaparecen los desplazamientos, las escalas y los bucles (regla global en `index.css` y comprobación en `volarAlCarrito`), pero el **feedback se conserva**: los cambios de color, fondo, borde y opacidad siguen con 150 ms. Tiempos: 100-150 ms para feedback inmediato, 300-500 ms para cambios de ruta (`.ruta-entra`, 0,4 s) y 0,8-1,2 s solo para la coreografía del escaparate.

## Tema oscuro

La «noche de mercado»: verde marino muy oscuro, no el azul-gris genérico. Página `#0A1D21`, tarjeta `#133136`, borde y chip `#214449`, escaparate `#0B3A3F` (para que se separe de la página), enlaces `brand-300`. Es un tema propio, no el claro invertido: el encabezado y los paneles pasan de turquesa a `slate-900` y los amarillos bajan a `#C99A2E`.

**Rampa de texto en oscuro.** Principal `#EDF1EC` (12:1 sobre la tarjeta), secundario `#A8B8B1` (6,7:1) y terciario `slate-400` `#A3B4AD`. Muchos textos usan un gris pensado para el modo claro (`text-slate-500`…) y sin variante `dark:`; en oscuro quedaban a 2,25:1 (la cabecera y las celdas de la tabla de usuarios del panel). `index.css` los aclara con una red de seguridad (`.dark .text-slate-500/600/700/800/900`) que no pisa a las variantes `dark:text-*` explícitas, que van después. `text-tinta` queda fuera a propósito: lo usan los textos sobre amarillo (avatar, contador de notificaciones).

**Cómo se comprueba.** `frontend/e2e/oscuro.spec.ts` mide el contraste real de cada texto de la tienda, el catálogo, el inicio de sesión y el registro, en oscuro y en claro, y falla si alguno baja de AA (4,5:1; 3:1 en texto grande). Los textos sobre fotos o degradados no se miden (`e2e/contraste.ts`). Al medir las 13 pantallas del producto (también panel de administración y de vendedor) el resultado fue 0 fallos en ambos temas.
## Datos y voz

Solo se muestran datos que la API entrega. Las reseñas son del puesto y se etiquetan así. No hay promesas de «fresco», «del día», «pago seguro» ni «gratis».
Se añadieron al listado de productos los campos de solo lectura `puesto_nombre`, `puesto_ofrece_domicilio` y `puesto_calificacion` (sin consultas extra).

## Landing (`/`) y tienda (`/tienda`)

`/` es una landing propia (`pages/Landing.tsx` + `Landing.module.css`, chunk aparte de ~17 kB) con su cabecera y su pie; no usa `PublicLayout`. La tienda (`Inicio`) vive en `/tienda`
y `/inicio` redirige allí. Con sesión iniciada, `/` redirige a `inicioPorRol` (comprador `/tienda`, vendedor `/vendedor`, administrador `/admin`); mientras la sesión carga se muestra el estado de carga.
Traducida de la maqueta aprobada: titular grande, ticket de pedido que se «imprime» y recorre los 5 estados (sello «Lo recibí»), franja turquesa, línea de seguimiento con `animation-timeline: view()`
(quieta y completa sin soporte), interruptor comprar/vender (`role="tablist"`, flechas), pasillo de puestos reales de la API (hasta 4, esqueletos, aviso si falla o no hay), reglas sobre fondo papel, cierre, pie y barra fija en celular.
Paleta propia y clara aunque la tienda esté en oscuro (CSS Modules, `color-scheme: light`). Con `prefers-reduced-motion` todo queda quieto y completo. Fotos en `public/landing/` (con crédito en `/creditos-fotos`).
