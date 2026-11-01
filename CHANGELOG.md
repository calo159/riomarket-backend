# Registro de cambios

Todos los cambios notables de RioMarket se documentan en este archivo.

El formato sigue [Keep a Changelog 1.1](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). Las fechas son las de unión a `main` (los números
`#N` son pull requests de [calo159/riomarket-backend](https://github.com/calo159/riomarket-backend));
lo anterior al PR #1 se hizo con commits directos y se resume por fases. El PR #9 se cerró sin unir.

## [Sin publicar]

### Cambiado

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
