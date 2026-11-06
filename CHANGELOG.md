# Registro de cambios

Todos los cambios notables de RioMarket se documentan en este archivo.

El formato sigue [Keep a Changelog 1.1](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). Las fechas son las de unión a `main` (los números
`#N` son pull requests de [calo159/riomarket-backend](https://github.com/calo159/riomarket-backend));
lo anterior al PR #1 se hizo con commits directos y se resume por fases. El PR #9 se cerró sin unir.

## [Sin publicar]

### Cambiado

- **Una tienda con carácter propio y más movimiento.** El primer pliegue estrena **banderines de fiesta** tendidos sobre la portada (la cuerda baja al abrir y
  cada banderín se mece, uno tras otro) y la palabra «Riohacha» se subraya con una ola que se traza al terminar el titular. Debajo de las categorías pasa una
  **cinta de precios** con productos reales y su precio en una etiquetita (se detiene al pasar el cursor; con «reducir movimiento» queda quieta y se recorre
  con el desplazamiento). La frase de «cómo funciona» se convierte en **tres pasos** (elige un puesto, sigue tu pedido, opina al recibirlo) unidos por una ola
  que se traza y con iconos que llegan con un rebote, uno tras otro. Nada nuevo en el texto: es lo mismo que decía la frase, ahora se ve.
- **Paleta con más profundidad y ritmo.** El primer pliegue de la tienda deja de ser un bloque turquesa plano: baja del turquesa del encabezado a uno más
  profundo, con un resplandor claro detrás de la foto, las olas del logo muy tenues y un borde festoneado que lo une con lo que sigue (en oscuro, lo mismo
  en verdes de noche). Los puestos van sobre una banda de color arena con festón arriba, así la página alterna turquesa, sal y arena en vez de repetir
  el mismo fondo. Para que la calificación (estrella) y «Domicilio» se lean también sobre la arena, esos dos colores se oscurecieron un poco (4,9:1 sobre
  la arena, 6,2:1 sobre blanco). El contraste se midió en claro y oscuro sin fallos.
- **La vitrina de la portada ya no muestra un solo puesto: van saliendo varios.** La foto grande y el ticket pasan por hasta cinco puestos con portada (los
  mejor calificados primero), uno cada unos seis segundos, con fundido entre fotos y el nombre, la calificación y el enlace del ticket cambiando con ella. Un
  indicador de puntos permite saltar a uno y el punto activo se llena para mostrar cuánto falta; se detiene al pasar el cursor y al enfocar con el teclado, y
  con «reducir movimiento» no rota sola. Si el comprador tiene un pedido en curso, la vitrina sigue siendo la de ese puesto. Las
  fotos se piden de una en una, no todas de golpe.
- **Detalles propios del mercado: cada puesto con su toldo, una ola que se dibuja bajo los títulos, etiqueta de precio y estados vacíos ilustrados.**
  Las tarjetas de puesto llevan un toldo festoneado del color de su primera categoría (el mismo motivo del primer pliegue, a escala de tarjeta; se echa un
  poco hacia abajo al pasar el cursor). Bajo cada título de sección se traza sola una ola del logo cuando la sección aparece. En la ficha del producto el
  precio cuelga como una etiqueta con su agujero y se asienta con un vaivén al abrir. El carrito vacío y el catálogo sin resultados muestran una canasta
  con una hoja que cae, y la página 404 es un puesto con el cartel «CERRADO» que se balancea («Este puesto ya cerró, o nunca existió»). Todo es SVG o CSS
  propio, se detiene con «reducir movimiento» y es decorativo para los lectores de pantalla.
- **El pedido y la compra se ven completos: fotos, un cierre con ticket y colores de estado de la marca.** Del checkout y el detalle del pedido faltaba lo
  más básico de una tienda: ver las fotos de lo que compras. Ahora el resumen del checkout y la lista de productos del pedido llevan la miniatura de cada
  producto (el servidor la trae en cada línea del pedido, `imagen`, precargada en bloque: sin una consulta por línea, comprobado con pruebas de conteo de
  consultas; la respuesta de «crear pedido» no la trae). Al confirmar, el aviso verde genérico pasa a ser un **ticket que se «imprime»** de arriba abajo con
  el sello de «enviado», el resumen (productos, entrega, total) y el mensaje de siempre sobre qué pasa ahora y cómo se paga. Los colores de estado
  (pendiente, en marcha, listo, entregado, cancelado) dejan los colores por defecto de la librería por tonos apagados y parejos de la marca, con versión
  oscura. En oscuro, las fotos se atenúan un poco para que las de fondo blanco no brillen como linternas.
- La landing ya no dice «Proyecto académico» (la nota sobre los pagos en línea en modo de prueba se conserva).
- **Paneles del vendedor y de administración sin aspecto de plantilla.** Las filas de tarjetas iguales (icono teñido,
  etiqueta y número; seis seguidas en «Resumen general») se cambian por un dato principal y una franja sobria con líneas
  finas. *Vendedor:* manda «Ingresos aprobados»; los pedidos por atender se destacan solo si hay alguno; la semana se lee
  día por día (nombre del día y lo vendido sobre la barra) y «Pedidos pendientes» toma la altura de su contenido, con un
  estado vacío que dice qué hacer. *Administración:* «Requiere atención» muestra el total de asuntos y los ordena primero;
  con todo en cero dice «Todo al día» en calma. Las cifras de ventas del periodo (también en `/vendedor/ventas`) son una
  sola tarjeta con «Ingreso neto» al frente. Contraste medido en ambos paneles, claro y oscuro, a 1440 y 390 px: 0 fallos.
- **Modo oscuro más legible y más movimiento visible.** *Oscuro:* se midió el contraste real de cada texto en 13 pantallas. Había textos con un gris
  pensado para el modo claro y sin versión oscura (la cabecera y las celdas de la tabla de usuarios del panel, a 2,25:1) y la etiqueta del ticket
  (3,65:1); ahora el oscuro tiene su propia rampa de texto (principal `#EDF1EC`, secundario `#A8B8B1`) con una red de seguridad que aclara esos grises
  sin tocar el claro, y el resultado es 0 textos bajo AA en ambos temas. Una prueba e2e nueva (`oscuro.spec.ts`) lo vigila en la tienda, el catálogo,
  el inicio de sesión y el registro. *Movimiento:* el escaparate tiene una coreografía de ~1,3 s (titular palabra por palabra, toldo, foto que se
  descubre y se asienta, acciones y ticket) y luego entran las categorías; con scroll, la foto se desliza un poco más lenta que la página; las
  entradas por scroll tienen más recorrido (26 px) y escalonado, las fotos de producto y de puesto se elevan con sombra al pasar el cursor y el
  cambio de ruta dura 0,4 s. Con «reducir movimiento» desaparecen los desplazamientos y los bucles, pero se conserva el feedback de color y opacidad.
- **La tienda pasa a un diseño sobrio y presentable, con la vara de Apple, Airbnb y Etsy.** Después de dos rondas que seguían viéndose «hechas por
  IA» (el crema con coral y las cartulinas de colores vivos), se pidió al dueño el rumbo y se eligió «sobrio y profesional». Se quitan los
  colores vivos y las bandas de color, los degradados, los títulos bicolor repetidos, el «cómo funciona» de tres iconos en círculo y las
  etiquetas arcoíris. Ahora: tarjetas de producto **sin marco** (la foto es la tarjeta, el precio en negrita y un solo botón redondo
  blanco que se vuelve coral al pasar el cursor); tarjeta de **puesto** con foto 3:2 y tres líneas, con sus categorías como texto con un
  punto de color apagado; **ficha de producto plana** con un único panel de compra que se queda fijo; buscador en **píldora** con el
  botón dentro; categorías en círculos con foto sin caja; un solo fondo y el espacio separa las secciones, con «Ver todos ›» a la derecha;
  escaparate con un toldo más fino, sin patrón de olas ni muescas, con la foto del puesto mejor calificado y, en oscuro, un fondo propio. El
  pie ya no dice «Proyecto académico»: dice cómo se paga (en efectivo al recibir o al recoger).
- **El carrusel genérico del primer pliegue de la tienda se reemplaza por un escaparate propio.** Era la plantilla de marketplace más
  repetida (carrusel con corte diagonal, flechas pegadas al borde y puntos). Ahora el primer pliegue es fijo: un titular grande
  («Compra directo en los puestos de Riohacha»), dos acciones, y un **puesto con toldo** (el símbolo del logo, franjas coral y crema con
  borde festoneado, que se despliega al cargar) con la portada de un puesto real. Sobre la foto va un **ticket** con muescas: el pedido en
  curso del comprador (estado, total y «Seguir mi pedido») o, si no tiene, un puesto real para empezar. Es la idea del ticket de la landing,
  ahora con datos. Se quitan también las tres tarjetas de «accesos rápidos» y los dos destacados repetidos, que decían lo mismo que el
  titular y la banda de puestos. El titular visible reemplaza al texto oculto de antes.
- **Identidad de color propia, en claro y en oscuro: las cartulinas de precio de un puesto de mercado.** La tienda «se veía simple y hecha por
  IA»: el crema con coral de la fase 1 es justo la apariencia en la que caen las interfaces generadas, y los degradados en botones y
  encabezados eran otra señal. Ahora el color significa algo: cada categoría tiene su cartulina (limón para frutas, guayaba para dulces,
  aguamarina para pescados, mango para bebidas…) y el precio de cada producto va en una etiqueta de ese color, con hueco para el cordel
  y una inclinación mínima, a caballo entre la foto y el texto; las categorías llevan un aro de su color y los chips de los puestos también.
  El fondo pasa del crema a «sal» (blanco verdoso), «Cómo funciona» es una banda amarilla, y se quitan los degradados de botones,
  encabezados y paneles. En oscuro, los neutros dejan el azul-gris genérico por una «noche de mercado» verde marino donde las cartulinas
  brillan. Cada par de colores cumple contraste AA y una prueba lo comprueba. Una segunda revisión independiente pidió más: la fila de
  categorías pasa de círculos en una caja blanca a cartulinas de color, la unidad va dentro de la etiqueta del precio, el botón de
  comprar de cada tarjeta es una pastilla compacta en vez de un bloque a todo lo ancho, los colores de cartulina se separan del coral de
  comprar y del turquesa de la marca, la grilla de puestos deja de dejar un hueco, y el oscuro separa mejor tarjetas y fondo.
- **Acabado de la tienda (fase 5 de 5 del rediseño visual).** Una calificación de 4,5 ya no se dibuja como cinco estrellas llenas
  (se redondeaba): ahora son cuatro y media. El pie se ordena (la columna «RioMarket» es una lista como las demás y la de «Vender»
  no aparece vacía para un comprador con sesión), los puntos del carrusel son más grandes y visibles, y lo que el navegador pinta por
  su cuenta lleva la marca: selección de texto amarilla, cursor y casillas turquesa y barra de desplazamiento en el tono del papel.
- **Movimiento con intención en la tienda (fase 4 de 5 del rediseño visual).** Un solo momento de marca al cargar: las categorías suben
  una tras otra justo después del carrusel. Más abajo, en lugar de que cada estante aparezca entero de golpe, el título y luego
  cada producto entran escalonados al llegar a ellos, y la banda turquesa de puestos ya está a la vista mientras sus tarjetas
  entran. Al agregar al carrito, el icono de confirmación hace un «sello» breve (también en el botón de escritorio). Todo con la
  misma curva que la landing, solo `transform` y `opacity`, y quieto con «reducir movimiento» (comprobado: nada se anima y nada
  queda oculto).
- **Tienda más ordenada: menos repetido y la regla de un pedido por puesto a la vista (fase 3 de 5 del rediseño visual).**
  Los dos destacados de debajo del primer estante ya no repiten los puestos del carrusel (si no queda ninguno, no se muestran).
  En la tarjeta de producto «Domicilio disponible» desaparece (era lo normal, 15 veces seguidas) y solo se avisa «Solo retiro en
  el puesto» cuando falta; en la página de un puesto sus productos ya no repiten el nombre, la calificación ni la entrega del
  puesto. Si el carrito ya tiene productos, la tienda y el catálogo dicen de qué puesto es el pedido y que cada pedido es de uno
  solo, antes de que alguien intente agregar de otro (antes se enteraba por un aviso de error). En celular las categorías pasan de
  dos filas a una fila deslizable, que deja ver los productos antes.
- **Títulos con la escala de la landing (fase 2 de 5 del rediseño visual).** Los títulos de sección de la tienda y de la página
  del puesto pasan de 23 px en peso 700 a 26-34 px en peso 900, con la última palabra resaltada («Recién **llegados**»; en la
  banda turquesa el resalte es amarillo) y los precios a peso 800. Es un componente nuevo, `TituloSeccion`.
- **La tienda se ve más viva y más de RioMarket (fase 1 de 5 del rediseño visual).** El revisor del proyecto la encontró «pálida»
  frente a la landing; la medición mostró que no faltaba color sino contraste y calidez. Ahora: fondo de papel cálido en lugar del
  gris frío; tarjetas con borde cálido y sombra de reposo; botón «Agregar al carrito» en coral relleno (antes un contorno turquesa
  repetido 15 veces); el carrusel ya no usa el azul que chocaba con el encabezado; «Puestos de Riohacha» pasa a una banda turquesa de
  ancho completo y «Cómo funciona» a una banda crema; en modo oscuro el amarillo es menos brillante. Todos los textos siguen en
  contraste AA. Siguen: tipografía, estructura, movimiento y acabado.

### Añadido

- **Respaldo diario de la base, cifrado y con la restauración probada** (ADR-023). Cada día un flujo de GitHub copia la base
  (solo los datos de RioMarket), la cifra con AES-256 antes de escribirla y la sube a un bucket privado; guarda 30 días. El
  archivo nunca se sube como artefacto de GitHub porque el repositorio es público. Una segunda prueba (al cambiar los
  scripts y una vez al mes) hace el ciclo completo con datos de demostración: respalda, comprueba que no se puede leer ni
  abrir con otra clave, restaura en una base vacía y compara las filas de cada tabla. Restaurar se niega a pisar una base que
  ya tiene datos. Requiere cargar los secretos `RESPALDO_*` una vez (ver `docs/despliegue.md`); sin ellos falla y avisa.
- **Aviso de errores a Sentry, opcional.** Con `SENTRY_DSN` los errores no controlados llegan con su línea de código;
  sin él no se envía nada. Solo errores y sin datos de personas: sin cuerpos, cabeceras, cookies, variables locales ni
  identidad del usuario.
- **Comisión, tarifa de domicilio y límites de atraso editables desde el panel** (ADR-022). Antes se cambiaban en
  variables de Render, con reinicio y sin rastro. Ahora **Administración → Configuración** deja ajustar la comisión (0 a
  50 %), la tarifa de domicilio, el aviso y la pausa por comisión pendiente. Lo del panel gana sobre la variable (que
  queda como valor de partida) y «Usar el del servidor» devuelve a ella. Rige solo para pedidos y pagos **nuevos**: los
  ya creados conservan lo que se les cobró. Cada cambio pide un motivo y queda en la auditoría con el valor anterior y el
  nuevo; hay topes contra errores de dedo y la pausa no puede quedar bajo el aviso. La pantalla muestra un ejemplo en
  pesos y cuántos vendedores hay al día, en aviso y en pausa. Es un recurso más del RBAC (`admin.configuracion`).
  - **Arreglo relacionado:** el checkout anunciaba la tarifa de domicilio con un valor fijado al compilar el frontend, que
    podía no coincidir con la que el servidor cobraba. Ahora la pide al servidor (`GET /api/configuracion/publica/`).
- **Más automatización en el repositorio.** Cuatro piezas que quitan trabajo manual y avisan antes de que lo note un
  cliente:
  - **Dependabot** propone cada semana las actualizaciones de Python y npm (agrupadas las menores) y cada mes las de
    GitHub Actions; el CI las prueba como cualquier PR.
  - **Escaneo de seguridad** en cada PR a `main` y una vez por semana: vulnerabilidades conocidas en las dependencias
    (`pip-audit`, `npm audit`). El análisis del código con CodeQL ya lo hacía GitHub por su cuenta.
  - **Prueba de humo tras cada despliegue** (`scripts/humo_produccion.py`): espera a que Render sirva el commit unido y
    comprueba que el sistema responde, que las migraciones están al día, que las cabeceras de seguridad están y que las
    rutas privadas exigen sesión. Solo lee; si falla, GitHub avisa por correo.
  - **Tareas programadas**: cada 10 minutos se visita el sistema, lo que lo despierta y dispara la liberación de pedidos
    vencidos aunque nadie esté comprando (Render gratis no tiene cron; ver ADR-012).
- **Panel de administración más completo.** Cuatro cosas que un administrador necesita a diario:
  - **Auditoría consultable.** La pantalla era una lista fija de 100 filas sin filtros, aunque el servidor ya los
    soportaba. Ahora se busca por correo, nombre o entidad, se filtra por acción y por fechas, se pagina, y la columna
    **«Qué cambió»** dice en una frase qué cambió y por qué (por ejemplo, «rol: comprador → vendedor · Motivo: …»).
  - **Exportar a CSV** usuarios, auditoría, pedidos y pagos, con los mismos filtros que se ven en pantalla. El archivo
    abre bien en Excel (tildes) y neutraliza las celdas que parecen fórmulas (`=`, `+`, `-`, `@`), que de otro modo
    podrían ejecutarse al abrirlo. Tiene un tope de 20.000 filas y avisa si lo alcanza. Pedidos y pagos solo para quien
    administra pedidos o pagos.
  - **Editar una cuenta y restablecer su contraseña.** «Editar cuenta» en `/admin/usuarios` corrige nombre, correo o
    celular (con motivo, auditado, avisa a la persona) y restablece la contraseña con una temporal que se muestra una
    sola vez y cierra las sesiones abiertas. Hace falta mientras no haya correo para recuperarla. Un administrador no
    toca su propia cuenta desde ahí (usa «Mi perfil») y quien gestiona usuarios por un rol personalizado no toca a un
    administrador.
  - **«Vendedores en pausa por comisión»** en «Requiere atención» del resumen, que lleva a `/admin/pagos`.
- **El administrador edita el menú desde la propia barra.** Quien tiene el recurso `admin.recursos` ve en la barra
  lateral del panel el botón **«Editar menú»**: al activarlo, cada opción lleva un lápiz que abre una ventana para cambiar
  su **nombre, icono, grupo y orden**, y la barra se actualiza en el acto, sin ir a `/admin/recursos`. Solo cambia cómo se
  ve la opción: la ruta, el ámbito y los permisos no se tocan desde ahí, así que no se puede dejar a nadie sin acceso. El
  icono se elige de una lista (con vista previa) en lugar de escribir su nombre, y el grupo sugiere los que ya existen. El
  formulario es el mismo de `/admin/recursos`, ahora compartido (`components/admin/FormularioRecurso`).
- **El administrador crea usuarios con un botón.** En `/admin/usuarios`, «Nuevo usuario» pide nombre, correo, celular y
  rol (comprador, vendedor o administrador). El sistema genera una **contraseña temporal** aleatoria (12 caracteres
  legibles) y la muestra **una sola vez**, con botón para copiarla: el administrador se la entrega a la persona, que
  la cambia en «Mi perfil». No se guarda en claro ni en la auditoría, que sí registra quién creó la cuenta. Un vendedor
  nace pendiente de verificación, como al registrarse, y solo un administrador base crea administradores (no quien
  gestiona usuarios por un rol personalizado). Endpoint: `POST /api/admin/usuarios/`.
- **Pago contra entrega a domicilio ([ADR-021](docs/ADR-021-pago-contra-entrega.md)).** El domicilio exigía el pago
  aprobado antes de que el puesto aceptara, algo que sin pasarela real solo se podía simular, y no es como se compra en
  Riohacha. Ahora el domicilio se paga **en efectivo cuando llega**: el checkout registra el pago en efectivo, el puesto
  confirma sin cobro previo y, al entregar, **entrega y cobra** (el botón dice «Entregar y cobrar»). Si el cliente no
  recibe y no se cobró nada, el puesto o el administrador pueden **cancelar el pedido en camino** (el stock vuelve y el
  pago se anula). Un domicilio ya pagado se comporta como antes. El cobro suma a la comisión que el vendedor le debe a
  RioMarket ([ADR-019](docs/ADR-019-comision-del-efectivo.md)).
- **Términos y condiciones y política de privacidad** (`/terminos`, `/privacidad`). El registro pedía aceptar «las
  condiciones de uso y el tratamiento de mis datos personales», pero esos textos no existían. Ahora hay dos páginas que
  describen lo que la app realmente hace (qué datos guarda, para qué, cookies, derechos de la Ley 1581 de 2012, reglas
  de compra y de comisión), enlazadas desde la casilla del registro y los pies de página. Son un texto base: conviene
  que el dueño del negocio confirme el contacto y que un abogado los revise antes de operar con clientes reales.
- **Política de atraso con la comisión del efectivo ([ADR-020](docs/ADR-020-politica-de-atraso.md)).** Hasta ahora
  deber la comisión no tenía consecuencia. Ahora la cuenta de cada vendedor tiene un estado: **al día**, **aviso**
  (deuda desde $50.000: el vendedor lo ve y recibe una notificación) y **en pausa** (desde $150.000: sus puestos no
  reciben pedidos *nuevos* hasta que pague; los pedidos en curso siguen). Al anotarse el pago que baja la deuda del
  límite, se reactiva solo y se le avisa; la pantalla le dice cuánto pagar. Los avisos salen al cruzar de estado, no
  en cada venta. Los límites se cambian con `COMISION_LIMITE_AVISO` y `COMISION_LIMITE_BLOQUEO` (`0` apaga cada uno).
  El administrador ve el estado de cada vendedor en `/admin/pagos`.

### Cambiado

- **Reglas de dinero y de cancelación revisadas ([ADR-018](docs/ADR-018-reglas-de-dinero-y-cancelacion.md)).** Una
  revisión de la lógica de negocio ([resumen](docs/logica-de-negocio.md)) encontró tres reglas que no tenían sentido
  para el negocio y que ninguna prueba cuestionaba:
  - **La comisión se calcula sobre lo que el cliente paga por la mercancía** (`subtotal − cupón`), no sobre el
    subtotal bruto. Antes, con un cupón del 50 % la plataforma cobraba en realidad un 16 % de lo que cobraba el
    puesto, y con uno del 100 % registraba comisión por un pedido de $0.
  - **La tarifa de domicilio es del puesto que reparte** (antes no era de nadie: el comprador la pagaba, el vendedor
    no la recibía y la plataforma se la quedaba además de su comisión). El panel de ventas muestra cuánto del ingreso
    neto son envíos. Se controla con `DOMICILIO_TARIFA_PARA_VENDEDOR` (por defecto `true`).
  - **El comprador cancela solo mientras el pedido está pendiente.** Antes podía cancelar con el producto ya
    cocinado o el encargo ya empezado, y recuperar todo su dinero. Ahora, tras aceptarlo el puesto, cancela el
    puesto o el administrador; el comprador ve un aviso que le explica qué hacer.
  - Los pagos ya registrados conservan su comisión; lo que cambia retroactivamente es que el neto de un domicilio
    anterior incluye su tarifa. Con la pasarela real habría que revisarlo con contabilidad antes de desplegar.

- **Arquitectura en capas ([ADR-017](docs/ADR-017-arquitectura-en-capas.md)).** Las apps del backend y las
  carpetas del frontend forman capas y solo dependen hacia abajo. Antes `common` (el núcleo) y `rbac` dependían de
  casi todo el dominio, había ciclos entre apps y 35 imports escondidos dentro de funciones para esquivarlos; ahora
  `common` y `rbac` no conocen el dominio, el grafo es acíclico (salvo `orders` ↔ `payments`, que son el mismo
  proceso de compra) y los imports diferidos bajan a 1 (el gancho de arranque de `reviews`).
  - Las insignias del menú las registra cada app dueña del dato (`rbac.menu.registrar_insignia`) y la reputación de
    los puestos la registra `reviews` en el catálogo (`catalog.anotaciones.registrar_anotador`), en vez de que
    `rbac` y `catalog` importen hacia arriba.
  - Movimientos de código, sin cambios de comportamiento ni de rutas de la API: los permisos por rol pasan de
    `common` a `accounts`; los comandos `seed_*` a la app `demo` (mismos nombres); `seo.py` y las vistas que
    entregan la SPA a la app `sitio`. En el frontend, `consultas` y `precarga` pasan a `api/`, `invalidarMenu` a
    `lib/` y `RutaProtegida` a `components/` (rompe el ciclo `auth` ↔ `navigation` y `lib` → `pages`).
  - Dos pruebas de arquitectura (`tests/test_arquitectura.py` y `frontend/src/arquitectura.test.ts`) hacen
    cumplir las reglas y dicen qué importación sobra; se comprobó que detectan cada tipo de violación.

- **Más carácter visual en toda la app.** El carrusel de destacados deja el color plano: degradado en diagonal,
  brillo detrás de la foto, textura de olas, olas inferiores que se mecen y la foto con el borde inclinado sobre
  una banda translúcida. Los motivos del logo (las olas y el toldo festoneado) aparecen como detalle en el panel
  de login y registro, los encabezados de página, los estados vacíos, la portada del puesto (con un borde ondulado
  que la funde con la tarjeta) y el pie de página, que ahora tiene el borde en medias lunas. El fondo de la página
  lleva un velo turquesa y otro amarillo muy suaves, y las tarjetas un reflejo sutil en el borde. Todo se detiene
  con «menos movimiento» y es invisible para los lectores de pantalla.
- **Pulido visual y de movimiento en toda la aplicación.**
  - La foto de un producto «viaja» de la tarjeta a la ficha (transición de vista; la ficha abre al
    instante con los datos de la tarjeta y, si el navegador no la soporta, navega como siempre).
  - Al cambiar de tema, el modo nuevo se revela en círculo desde el botón.
  - Las cifras de los paneles cuentan hasta su valor; los productos se deslizan y se pliegan al salir del
    carrito; los pasos del pedido aparecen en orden y el de «Entregado» cierra en verde con un anillo; la
    campana se mueve cuando llegan avisos nuevos y los campos de formulario con error se sacuden una vez.
  - Profundidad: degradado sutil en el encabezado y en el botón principal, con relieve al pasar el cursor.
  - Todo respeta «reducir movimiento»: sin animación, el valor final se muestra de una vez.
- **Movimiento en el resto de la aplicación.** Los listados (mis pedidos, carrito, notificaciones,
  direcciones, pedidos y reseñas de vendedor y administrador), las tarjetas de resumen de los paneles y
  las filas de las tablas suben unos píxeles al cargarse, y los bloques de la página de inicio aparecen
  al llegar a ellos. Mismas reglas que en la landing: visible por defecto y sin movimiento si la persona
  lo pidió.
- **Movimiento en la landing y en las cuadrículas.** Las secciones de la landing aparecen al llegar a
  ellas (solo las que están debajo de la pantalla inicial), el subrayado amarillo de la franja se dibuja
  bajo la frase clave y las tarjetas de productos y puestos suben unos píxeles al cargarse. Todo es
  visible por defecto; con «reducir movimiento» no se oculta ni se anima nada.
- **Menos peso en la tienda.** El logo de demostración de cada puesto se reduce a 192 px (de 40–134 kB a
  5–16 kB) y las fotos fijas de `categorias/` y `landing/` se guardan una semana en el navegador, en
  vez de 60 s. Los despliegues con logos grandes los reducen solos al arrancar; los que subió un
  vendedor no se tocan.
- **Comisión de la plataforma: del 5 % al 8 %.** Nuevo valor por defecto de `PLATFORM_COMMISSION_PERCENTAGE`
  en producción, `render.yaml`, `.env.example` y documentación. Solo afecta a los pagos nuevos: los ya
  registrados conservan la comisión con que se calcularon. En un servicio ya creado hay que cambiar la
  variable en Environment de Render.

### Añadido

- **La comisión del efectivo ya se puede cobrar ([ADR-019](docs/ADR-019-comision-del-efectivo.md)).** Casi todo se
  paga en efectivo en el puesto, así que el vendedor se queda con el dinero y le debe su comisión a RioMarket; antes
  el sistema la calculaba pero no había cómo cobrarla. Ahora hay una cuenta por vendedor (lo generado, lo pagado y lo
  que debe): el administrador la ve en `/admin/pagos` y **anota cada pago que recibe** (Nequi, transferencia o en
  mano), y el vendedor ve su saldo en «Ventas». No se puede anotar más de lo que se debe, cada anotación queda en la
  auditoría y avisa al vendedor. No cobra solo ni suspende a nadie: esa política la decide el dueño.
- **Logo nuevo.** Un toldo de puesto de mercado sobre dos olas de río (el Ranchería de Riohacha), junto a la
  palabra «RioMarket». Aparece en el encabezado, el pie, el panel, el login y la landing; hay versiones
  horizontales y sin cuadro para fondos oscuros, favicon propio para pestañas pequeñas, íconos de la app
  (incluido el «maskable» de Android y el de iOS) y una tarjeta nueva al compartir enlaces. Los archivos están
  en `frontend/public/brand/` y se regeneran con `scripts/generar_logo.py` y `frontend/scripts/exportar-marca.mjs`
  (este reemplaza a `scripts/generar_og.py`).
- **Sugerencias al escribir en el buscador.** Desde dos letras muestra productos (con foto y precio) y
  puestos, resalta lo escrito y se maneja con teclado (flechas, Enter, Escape) como un combobox accesible.
  Sin nada marcado, Enter busca en el catálogo como antes.
- **Barra de compra fija en la ficha del celular.** Mantiene a mano el precio, «Agregar» y «Comprar ahora»
  mientras el botón de la página no se ve.
- **Recuperar y cambiar la contraseña desde la web.** El servidor ya lo permitía, pero no había pantallas:
  «¿Olvidaste tu contraseña?» en el login, la pantalla para elegir una nueva (con el enlace del correo o
  pegando el código) y una sección «Cambiar contraseña» en el perfil. Un enlace vencido o ya usado se
  explica y ofrece pedir otro; la respuesta nunca revela si un correo está registrado; al cambiarla se
  cierran todas las sesiones, incluida la actual.
- **El correo de recuperación trae un enlace** (antes solo un código) y sale por la API HTTP de Brevo, porque
  Render gratis bloquea SMTP. Se activa con `BREVO_API_KEY` y `DEFAULT_FROM_EMAIL`; sin ellas la recuperación
  funciona pero ningún correo sale. Ver `docs/despliegue.md`.

### Corregido

- **Los despliegues en Render fallaban con `EMAXCONNSESSION`.** El arranque usaba 2 procesos × 4 hilos, hasta 8
  conexiones por instancia, y cada una se conserva 60 segundos; el *Session pooler* de Supabase admite 15 en total y,
  durante un despliegue, conviven la instancia vieja y la nueva (más cualquier otro servicio conectado a la misma
  base). Ahora usa 1 proceso × 4 hilos por defecto (`WEB_CONCURRENCY` y `GUNICORN_THREADS` lo ajustan) y
  `docs/despliegue.md` explica el límite y la regla de un solo servicio por base de datos.
- **«Ingresar» no estaba al lado derecho del carrito.** En escritorio quedaba antes de «Mis pedidos», lejos del
  borde; ahora el orden es «Mis pedidos · Carrito · Ingresar» (con sesión iniciada, tu cuenta ocupa ese último
  lugar). En el celular no había ningún «Ingresar» en el encabezado (solo dentro de «Cuenta», en la barra de
  abajo): ahora aparece a la derecha del carrito, con el texto en pantallas de 400 px o más y como ícono en las
  más angostas.
- **El carrusel de destacados tapaba el texto en tabletas y pantallas medianas.** Entre 768 y 1280 px la flecha
  izquierda cubría la primera letra del texto y, bajo ~1100 px, el título y la descripción se metían sobre la
  foto (con la foto en blanco y texto blanco, ilegible). El texto ahora se limita al espacio libre a la
  izquierda de la foto y la flecha es más angosta. Se midió el contraste real sobre los píxeles de cada
  diapositiva en cinco anchos (mínimo 5,1:1).
- **Accesibilidad, según un recorrido automático de todas las pantallas con los cuatro roles.** Las
  calificaciones con estrellas ahora son imágenes con nombre (antes llevaban un `aria-label` sin rol, que los
  lectores de pantalla ignoran o leen mal); la tabla de auditoría se puede recorrer con el teclado en el
  celular; el login y el registro tienen un único título principal también en el celular (el del panel
  decorativo no se ve ahí); la página 404 tiene su región principal; y los menús laterales y resúmenes tienen
  nombre propio. El recorrido final no encuentra ningún problema.
- **El esquema de la API tenía avisos y un error de documentación.** Tres enumeraciones llevaban un sufijo
  generado (`EstadoB1eEnum`) que cambia al tocar las opciones y rompe los tipos del frontend; ahora tienen
  nombre fijo. «Marcar imagen principal» se documentaba como si recibiera y devolviera un producto, cuando no
  recibe nada y devuelve una imagen. Una prueba nueva falla si vuelven los avisos.
- **Los elementos fijos dentro de una página se colocaban mal.** La transición de entrada de página
  conservaba su último cuadro (`animation-fill-mode: both`), y el navegador tomaba la página como contenedor
  de todo lo `position: fixed` de dentro: la barra de compra de la ficha quedaba sobre el pie de página en
  vez de sobre la navegación inferior. Ahora la animación no conserva el último cuadro, con una prueba que
  lo impide.
- **El zoom de la foto del producto se quedaba atascado.** Dependía solo de `:hover`, y en el celular la
  foto quedaba ampliada sin forma de alejarla. Ahora se amplía con un clic o un toque y se aleja con otro
  (o con Escape); sigue al cursor o al dedo para ver los bordes y, con mouse, se aleja al salir del marco.
- **«No encontramos este producto» cuando en realidad se había pasado el límite de solicitudes.** Las
  fichas de producto, puesto y pedido distinguen ahora «no existe» de «demasiadas consultas», «sin
  conexión» y «error del servidor», y ofrecen reintentar cuando tiene sentido.
- **Límite de solicitudes demasiado bajo para navegar.** Una ficha de producto hace unas 7 llamadas, así
  que 60/min anónimo se agotaba en segundos, sobre todo en redes compartidas (un salón, un celular con
  datos). Pasa a 240/min anónimo y 600/min autenticado (`THROTTLE_ANON` y `THROTTLE_USER`); inicio de
  sesión, registro, verificación y pagos conservan los suyos. El aviso de la API ahora está en español
  claro e indica cuántos segundos esperar.

## [1.0.0] - 2026-10-31

### Añadido

- **Núcleo del marketplace (7–9 oct, commits directos).** API REST con Django 5 y DRF: registro e inicio
  de sesión con JWT, catálogo (puestos, categorías, productos e imágenes), verificación de vendedores,
  pedidos de un solo puesto con stock transaccional, pagos con pasarela de pruebas, direcciones,
  notificaciones, reseñas, cupones y auditoría; CI de GitHub Actions.
- **Datos de demostración (14 oct).** Comando `seed_masivo` con datos de Riohacha (usuarios, puestos,
  productos, pedidos, pagos, reseñas, notificaciones y auditoría) y respaldos en `entrega/`.
- **Aplicación web y despliegue (23–28 oct, #1).** SPA en React y TypeScript para comprador, vendedor y
  administrador; refresh de sesión en cookie HttpOnly; despliegue en Render con PostgreSQL y datos demo
  automáticos.
- **Entrega por roles y administración (#2).** Entrega con confirmación del comprador, reporte «No me ha
  llegado», acciones permitidas por rol y estado en cada pedido, app de administración (usuarios,
  moderación de puestos y productos, resumen) y menú dinámico por rol.
- **RBAC con roles y recursos (#3).** Roles, recursos y permisos efectivos gobernados por el
  administrador, con candados anti-bloqueo y anti-escalada, y registro de auditoría de cada decisión.
- **Retiro en el puesto con pago al recoger (#16).** Estado «listo para recoger» solo para retiros,
  confirmación de un retiro con efectivo sin cobro previo y «Entregar y cobrar» en una sola operación
  ([ADR-009](docs/ADR-009-retiro-y-pago-al-recoger.md)).
- **Contacto, mapa, volver a pedir y app instalable (#17).** Botón «Escribir por WhatsApp» por puesto
  (apagado por defecto), mapa público `/mapa` con OpenStreetMap, «Volver a pedir» y manifiesto con página
  sin conexión ([ADR-010](docs/ADR-010-contacto-mapa-y-pwa.md)).
- **Rendimiento y SEO (#18).** Build comprimido (Brotli y gzip) con caché inmutable para archivos con
  hash, miniaturas de las fotos, precarga de datos, `robots.txt`, `sitemap.xml` y metaetiquetas por ruta;
  Lighthouse móvil sube de 79 a 97 (`/`), de 67 a 94 (`/tienda`) y de 70 a 91 (`/catalogo`)
  ([ADR-011](docs/ADR-011-rendimiento-y-seo.md), [medición](docs/rendimiento.md)).
- **Apartar con plazo (#20).** Un retiro que nadie confirma o recoge a tiempo se cancela solo y devuelve
  stock, cupón y pago; el vendedor puede dar más tiempo hasta dos veces; barrido perezoso sin cron y
  comando `cancelar_pedidos_vencidos` ([ADR-012](docs/ADR-012-apartar-con-plazo.md)).
- **Productos por encargo (#21).** Tortas, pudines y similares sin stock: tiempo de preparación, detalles
  del comprador y fecha pedida; «Aceptar encargo» como confirmación
  ([ADR-013](docs/ADR-013-productos-por-encargo.md)).
- **Panel de ventas (#22).** `GET /api/payments/ventas/` y pantalla `/vendedor/ventas` (y sección en
  `/admin`) con ventas por día, ingreso neto, ticket promedio, lo más vendido y pedidos por estado
  ([ADR-014](docs/ADR-014-panel-de-ventas.md)).
- **Documentación de ingeniería.** Matriz de trazabilidad requisito → pantalla → endpoint → prueba,
  verificada en el CI ([trazabilidad](docs/trazabilidad.md)), diagramas de secuencia y despliegue
  ([diagramas](docs/diagramas.md)), guion de demostración de 5 minutos
  ([presentación](docs/PRESENTACION.md)), `CHANGELOG.md`, `SECURITY.md` y `CONTRIBUTING.md`.

- **Observabilidad mínima ([ADR-015](docs/ADR-015-observabilidad.md)).** Cada respuesta lleva
  `X-Request-ID` (se reutiliza el del cliente solo si son 8 a 64 letras, números o guiones; si no, se
  genera uno); en producción los registros salen en JSON de una línea con `request_id`, y cada petición
  deja un registro de acceso con método, ruta sin query string, estado, duración y número de usuario,
  sin cuerpos, cabeceras, cookies ni datos personales. `/api/health/` suma `version` (commit corto),
  `migraciones`, `almacenamiento_externo` y `hora_servidor` sin quitar `status` ni `database`.
- **Pruebas end-to-end por rol en el CI ([ADR-016](docs/ADR-016-pruebas-end-to-end.md)).** Trabajo
  `e2e` (solo en pull requests y en `main`) que levanta PostgreSQL, siembra los datos de demostración,
  construye el frontend y lo sirve desde Django con la configuración de producción. Cubre al comprador
  (retiro con pago al recoger y encargo, en celular), a la vendedora (de «Confirmar» a «Entregar y
  cobrar», aceptar un encargo y panel de ventas), al administrador (resumen, auditoría del sistema,
  usuarios y roles) y a una persona sin sesión (landing, tienda, mapa y créditos de fotos). Cada
  prueba usa su propio comprador del seed y limpia lo que crea; un reintento por prueba solo en el CI,
  con las reintentadas anotadas en el resumen; trazas, capturas y vídeo solo si falla (7 días).
- **Umbral de cobertura en el CI.** El backend falla bajo el 91 % (medido 94 % con ramas); el
  workflow ya revisa también el formato de `scripts/`.

### Cambiado

- **Interfaz estilo marketplace (#10).** Rediseño de todas las pantallas del comprador, vendedor y
  administrador con encabezado con buscador, tarjetas y barra inferior en el celular; la lógica y los
  permisos no cambian.
- **Landing y tienda (#12, #14, #15).** La portada `/` es una landing propia y la tienda pasa a `/tienda`
  (`/inicio` redirige); categorías y accesos rápidos con fotos reales en lugar de iconos.
- **Optimización según la auditoría (#7).** Menos consultas en resúmenes y reordenamiento de imágenes,
  caché por petición de los permisos y mejoras del bundle y de la caché de datos del frontend.
- **Auditoría y pendientes (#3, #5).** Límite de intentos compartido (con Redis) y soporte de `NUM_PROXIES`,
  fotos de cédula en un bucket privado opcional, webhook de pagos con validación de monto y fecha, y
  pruebas de la suite contra PostgreSQL en el CI.
- **Archivos locales (#4).** `.claude/settings.json` deja de versionarse.
- **Sesiones (aviso de #18).** La landing ya no espera al servidor gracias a una cookie de pista de
  sesión (`rm_hay_sesion`, sin secretos). Las sesiones iniciadas antes de este cambio aparecen cerradas
  **una sola vez**: la persona debe volver a iniciar sesión.

- `LOG_FORMAT` (opcional): `json` por defecto en producción, `texto` en desarrollo y pruebas.

### Corregido

- **Caché en memoria sin Redis (#8).** La caché del límite de intentos en base de datos añadía unas 6
  consultas por petición y hacía lentas las lecturas con una base remota; sin `REDIS_URL` se vuelve a la
  memoria del proceso.
- **Fotos demo (#11).** El seed recrea las fotos cuando Render borra el disco efímero.
- **Fotos del almacén externo (#13).** La política de seguridad de contenido (CSP) permite las imágenes
  servidas desde el almacenamiento externo configurado.
- **Contraste en la landing (#19).** Los títulos del seguimiento de pedido cumplen el contraste AA.

### Seguridad

- **Auditoría general (#3, #5).** 91 hallazgos revisados en [la auditoría](docs/AUDITORIA.md); entre los
  corregidos: reposición doble de stock al cancelar, cupón sin liberar, token de recuperación escrito en los
  logs, comparación de origen por prefijo y autoaprobación de pagos (limitada a los pagos simulados).
- **Dependencias (#6, #19).** Se cerraron las 20 alertas de Dependabot de aquel momento (vite, vitest,
  react-router, zod y otras) y la alerta alta de `follow-redirects`. Hoy `npm audit` solo reporta avisos
  moderados de herramientas de desarrollo (0 en dependencias de producción) y `pip-audit` no reporta
  vulnerabilidades. Ver [SECURITY.md](SECURITY.md).

[Sin publicar]: https://github.com/calo159/riomarket-backend/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/calo159/riomarket-backend/releases/tag/v1.0.0
