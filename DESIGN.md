---
name: RioMarket
description: La canasta plástica del mercado de Riohacha, hecha interfaz. Color macizo, plástico moldeado, ranuras y asa.
colors:
  azul-canasta: "#1546c0"
  azul-profundo: "#0f2f80"
  rojo-canasta: "#d6261f"
  amarillo-sol: "#ffc400"
  verde-canasta: "#0b7a3e"
  tinta: "#11162b"
  tinta-suave: "#666e8a"
  papel: "#ffffff"
  azul-oscuro: "#2f62dc"
typography:
  display:
    fontFamily: "Rubik Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Rubik Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "Rubik Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
  body:
    fontFamily: "Rubik Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Rubik Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  control: "8px"
  block: "8px"
  large: "10px"
  slot: "9999px"
spacing:
  gap-pared: "3px"
  gap-rejilla: "12px"
  gap-seccion: "56px"
components:
  button-primary:
    backgroundColor: "{colors.azul-canasta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-sol:
    backgroundColor: "{colors.amarillo-sol}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
  bloque-canasta-azul:
    backgroundColor: "{colors.azul-canasta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.block}"
  bloque-canasta-amarilla:
    backgroundColor: "{colors.amarillo-sol}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.block}"
  input:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: RioMarket

## Overview

**Estrella del norte creativa: «La canasta».** RioMarket se dibuja como las canastas plásticas que se apilan en el mercado: rojas, azules, amarillas y verdes, con su retícula de ranuras en el costado y el asa moldeada arriba. Es plástico: color macizo, esquinas de 8 px, sin sombras ni degradados. La profundidad viene del color y de los bordes, no de la luz.

El uso principal es el celular, a menudo en la calle y con sol. Por eso el fondo es blanco de verdad, el contraste es alto (WCAG AA verificado en todas las combinaciones principales) y los objetivos táctiles miden 44 px. La voz es directa y de tú, sin promesas que el producto no pueda demostrar. Los motivos wayuu no se usan como decoración.

Dos modos de uso:

- **Persuade** (inicio, puesto, auth): el mundo manda. Pared de canastas a sangre, bandas de color, titulares en Rubik 800.
- **Operate** (paneles de vendedor y administración): el mundo solo presta tipo, paleta, densidad y la retícula. La navegación, la disposición y los controles son los estándar.

## Colors

Paleta completa con cuatro roles, más la tinta.

- **Azul canasta** (`#1546c0`, escala `brand`): primario, acción principal, enlaces, foco. Blanco sobre él da 7.9:1.
- **Rojo canasta** (`#d6261f`, escala `rojo`): problema, cancelado, rechazado, errores y destructivo. Blanco sobre él da 5.1:1.
- **Amarillo sol** (`#ffc400`, escala `sol`): espera, pendiente y avisos. Siempre con texto en tinta (11.2:1), nunca blanco.
- **Verde canasta** (`#0b7a3e`, escala `verde`): bien, entregado, aprobado. Blanco sobre él da 5.4:1.
- **Tinta azulada** (`#11162b`, reemplaza a `slate`): texto, bordes fuertes y fondo oscuro.
- **Papel** (`#ffffff`): fondo claro. Sin crema.

**Reglas de uso**

- **El color significa categoría** en bloques de categoría, chips de categoría y fallbacks de imagen. Una función pura (`colorDeCategoria` en `src/lib/categoria.ts`) asigna uno de los cuatro colores según el id, siempre el mismo.
- **En paneles el color significa estado**, no categoría. Los chips de estado (`EtiquetaEstado`) son macizos: verde = bien, amarillo = espera, azul = en curso, rojo = problema, gris tinta = reembolsado o desconocido.
- El bloque titular del inicio usa el azul profundo (`#0f2f80`) para no confundirse con una categoría azul vecina.
- Oscuro: fondo tinta `#11162b`; el azul sube a `#2f62dc` (blanco 5.4:1) para botones y bloques; rojo y verde conservan su valor; el amarillo y la tinta no cambian. El anillo de foco pasa a amarillo.

## Typography

**Rubik variable** (`@fontsource-variable/rubik`, autoalojada, solo subconjunto latino, ~35 kB), para todo.

- Títulos: 800, sin gradiente ni texto en dos colores, `text-wrap: balance`.
- Cuerpo: 400 a 500. Etiquetas y botones: 600.
- Display máximo 4.5 rem en el bloque titular (72 px en escritorio); 3 rem en celular.
- Cifras: `tabular-nums` en precios, totales y tablas (Rubik trae la característica `tnum`; se verificó que 1111 y 0000 miden lo mismo). Utilidad `.tnum`.
- Cabeceras de tabla y de grupos de menú sin mayúsculas ni tracking.

## Layout

- **Pared de canastas** (inicio): primer viewport a sangre, bloques de anchos desiguales (pesos que se repiten por fila) separados por 3 px. El bloque azul profundo, más grande, lleva «¿Qué llevas hoy?» y el buscador. En celular y tableta la pared se aplana: bloque azul primero y las canastas en 2 (o 3) columnas; la última se ensancha si queda huérfana.
- **Rejilla de productos**: densa, 2 columnas en celular, 3 en tableta, 4 a 5 en escritorio, separación 12 px horizontal y 24 px vertical, sin cajas.
- **Contenedor**: `max-w-7xl`, gutter 16 px en celular y 24 px desde `sm`.
- **Celular**: barra de pestañas fija abajo (Inicio, Catálogo, Canasta, Menú) para usar con una mano; en Canasta y Pago esa barra cede su lugar a una barra fija con el total y la acción.
- **Paneles**: sidebar plano de 256 px, tablas con celdas de 12×8 px, el contenido en `max-w-7xl`.

## Elevation & Depth

Plano y sin sombras. La profundidad se logra con bloques de color macizos, bordes de 1 px (`slate-200`) y, para énfasis, bordes de 2 px en tinta (botón secundario, modales, resumen de la canasta). No hay `box-shadow` decorativo, vidrio ni `backdrop-filter`. Los modales se separan con un velo de tinta al 50 %.

## Shapes

- Plástico moldeado, no píldoras: `rounded-lg`/`rounded-xl` = 8 px, `rounded-2xl` = 10 px en toda la app. `rounded-full` solo en avatares y contadores de insignia.
- **Retícula (firma visual)**: filas de ranuras redondeadas de 28×14 px (máscara SVG en `index.css`, clase `.reticula`, componente `Reticula`). Se usa en bordes de bloques de color y fallbacks de imagen. Nunca como textura de fondo bajo texto. Funciona con la CSP estricta (`img-src data:`).
- **Asa** (`.asa`): una ranura redondeada de 64×12 px recortada en el borde superior de bloques de categoría, bandas de puesto y bloques de acción, con el color del fondo de la página.

## Components

- **Botón**: `btn-primary` (azul, blanco), `btn-secondary` (borde de 2 px en tinta sobre blanco), `btn-ghost`, `btn-danger` (rojo), `btn-sol` (amarillo con tinta). Altura mínima 40 px, 44 px con puntero táctil. Sin sombra.
- **Campo** (`.input`): borde 1 px `slate-400` (3:1), 8 px de radio, foco azul (amarillo en oscuro) con halo suave.
- **Tarjeta de producto**: sin caja ni sombra. Foto cuadrada de 8 px de radio, botón de agregar de 44 px sobre la esquina inferior derecha de la foto, **precio grande** con la unidad al lado (`$ 3.000 / kg`), nombre y puesto. Sin insignia sobre la foto ni escala al pasar el cursor. Sin foto: bloque del color de la categoría con la inicial grande y retícula.
- **Letrero de puesto** (`PuestoCard`): bloque del color de su categoría principal con el nombre grande, asa y retícula; dirección y reseñas debajo. En el detalle del puesto es una banda a sangre con texto claro.
- **Chips de categoría**: borde y texto del color de la categoría; seleccionado, macizo.
- **Canasta del encabezado** (`CanastaIcono`): SVG propio con 6 celdas, una por unidad (hasta 6). Al agregar, la última celda entra con una animación de 320 ms. Es el único movimiento de la interfaz; con `prefers-reduced-motion` no hay animación. El nombre accesible incluye el contador (`Canasta, N productos`).
- **Avance del pedido** (`PasosPedido`): fila de 5 ranuras que se llenan; un pedido cancelado muestra un bloque rojo y ranuras discontinuas.
- **Chips de estado** (`EtiquetaEstado`): macizos y consistentes en todas las tablas.
- **Tabla**: cabecera gris suave sin mayúsculas, filas de 8 px de padding vertical, hover tenue, cifras tabulares.
- **Vacíos y errores**: texto directo que dice qué hacer, sin ilustraciones; borde discontinuo para vacíos y borde rojo de 2 px para errores. Esqueletos planos con la forma real del contenido, sin pulso.
- **Superficies del navegador**: selección de texto amarilla con tinta, `caret-color` azul (amarillo en oscuro), `accent-color`, barras de desplazamiento y `text-underline-offset: 3px` temados.

## Do's and Don'ts

**Sí**

- Usa un solo color macizo por bloque y deja que el color signifique categoría (público) o estado (paneles).
- Pon texto en tinta sobre amarillo, y blanco sobre azul, rojo y verde.
- Usa la retícula y el asa en bordes de bloques; mantén el texto sobre color liso.
- Escribe de tú y di qué hacer. El nombre del puesto encabeza la canasta y el pago, porque un pedido es de un solo puesto.
- Mantén foco visible, 44 px táctiles y contraste AA.

**No**

- No uses degradados, vidrio, `backdrop-blur`, manchas difuminadas ni sombras decorativas.
- No pongas etiquetas o eyebrows sobre los títulos, ni subtítulos de relleno.
- No uses iconos de relleno (el icono de tienda repetido, círculos con símbolo) ni ilustraciones genéricas.
- No uses `rounded-full` salvo avatares y contadores.
- No uses color de categoría en los paneles de vendedor y administración.
- No afirmes «del día», «sin intermediarios», «pago seguro», «hoy mismo» ni «gratis» donde el producto no lo demuestre (hay comisión de plataforma y no hay pasarela real).
- No uses motivos wayuu como decoración.
