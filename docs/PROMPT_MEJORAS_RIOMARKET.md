# PROMPT PARA OPENCODE — Mejoras de RioMarket: imágenes reales y durables, funcionalidades que faltan, calidad y presentación

## Rol
Actúa como ingeniero de software senior full-stack (Django/DRF + React/TypeScript) con criterio de producto, seguridad y rendimiento. Trabajas en el repo `riomarket-backend`: API Django/DRF (10 apps), SPA React en `frontend/`, despliegue en **Render** (un solo servicio Docker; Django sirve la API y el build del frontend con WhiteNoise), base PostgreSQL, `.env` versionado a pedido del profesor, CI en GitHub Actions. La app **ya está publicada en `https://riomarket.onrender.com/`** y funciona. Tu tarea es llevarla de "funciona" a "se ve y se siente como un producto real", sin romper nada de lo existente. Commits pequeños en español, en una rama `feat/mejoras-producto`. No hagas push sin que yo lo pida.

## Reglas de trabajo (obligatorias)
1. **Línea base antes de tocar nada**: `pytest -q` (hoy 482 pasan), `ruff check apps tests config --no-cache`, `python manage.py makemigrations --check --dry-run`, `python manage.py spectacular --validate`, y en `frontend/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Guarda los resultados.
2. Después de **cada fase**: toda la verificación en verde (igual o más pruebas que antes, nunca menos sin justificar). Si algo se rompe, arréglalo o revierte esa fase.
3. Cambios de modelo = migración + pruebas + actualizar seeds, serializers, OpenAPI y documentación. No edites migraciones ya existentes.
4. Verifica visualmente con **Playwright** (capturas en escritorio 1440 px y móvil 390 px, claro y oscuro) y corrige lo que se vea mal. Guarda las buenas en `docs/capturas/` y úsalas en el README.
5. No inventes datos ni métricas: todo número sale de una ejecución real.
6. Compatibilidad: el `.env` versionado y `render.yaml` deben seguir funcionando con los valores por defecto (sin servicios externos obligatorios). Todo lo externo (almacenamiento, claves de API) se activa por variable de entorno y tiene un **respaldo local** que funciona sin configuración.
7. Seguridad primero: nunca imprimas ni registres secretos; las fotos de cédula siguen siendo **privadas** (ADR-002).

## Diagnóstico verificado del estado actual (punto de partida)

**Imágenes (el hueco más visible)**
- El backend ya permite subir imágenes (`POST /api/catalog/productos/{id}/imagenes/`, modelo `ImagenProducto`, orden) y el frontend tiene galería en el detalle y un modal de subida para el vendedor.
- **Pero el seed no crea ninguna imagen**: `seed_masivo` genera 40 productos sin fotos, así que el catálogo de la demo se ve con íconos grises (`ImageOff`) en todas las tarjetas.
- **No existe carpeta `seed_images/`** ni créditos de imágenes.
- `Puesto` no tiene logo ni portada; `Categoria` no tiene ícono ni imagen; `PuestoCard` no muestra imagen.
- **En Render el disco es efímero**: cualquier imagen subida se pierde en cada reinicio o redeploy. No hay almacenamiento durable (no hay `django-storages`).
- No se redimensionan ni optimizan las imágenes al subirlas (peso alto, sin miniaturas, sin `srcset`) y no se eliminan los metadatos EXIF (puede filtrar ubicación GPS del vendedor).

**Funcionalidad ausente (verificado con búsquedas en el código)**
- Sin cambio ni recuperación de contraseña; sin avatar de usuario.
- Sin favoritos/lista de deseos, sin mapa de puestos (hay latitud/longitud en el modelo y la CSP ya permite los tiles de OpenStreetMap, pero no hay mapa), sin gráficos en los paneles (solo tarjetas de números), sin exportación CSV, sin alertas de stock bajo, sin PWA/service worker, sin notificaciones en tiempo real.
- `EnlacePrecarga.tsx` existe pero **no se usa en ningún lado**: la precarga de rutas prometida no está conectada.

**Calidad y seguridad**
- Solo 10 pruebas de frontend en 3 archivos y un smoke E2E de 19 líneas (sin flujos por rol). `pytest` emite ~200 *warnings*. Sin umbral de cobertura en CI. Sin auditoría de accesibilidad automatizada.
- `npm audit` tiene 12 avisos (2 críticos, 2 altos), principalmente en herramientas de desarrollo.
- SEO: título y descripción iguales en todas las páginas, sin `og:image`, sin `robots.txt`/`sitemap.xml`; `docs/capturas/` y `docs/rendimiento.md` sin contenido real.
- Render: la base PostgreSQL gratuita **caduca a los 30 días**; el servicio se duerme tras ~15 min (arranque en frío de ~1 min sin explicación al usuario).

## Fases (prioridad: P0 imprescindible, P1 muy recomendable, P2 si hay tiempo)

### FASE 1 (P0) — Imágenes: de los íconos grises a un catálogo con fotos
**1.1 Almacenamiento durable (variable de entorno, con respaldo local)**
- Agrega `django-storages[s3]` y `boto3`. Configura `STORAGES` en `prod.py` para elegir el backend por variable: si existe `STORAGE_S3_BUCKET` (y claves) usa **Supabase Storage por su API compatible con S3** (o cualquier S3: Cloudflare R2, AWS); si no, usa el sistema de archivos local como ahora. Variables sugeridas: `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY`, `STORAGE_S3_SECRET_KEY`, `STORAGE_S3_BUCKET_PUBLICO`, `STORAGE_S3_BUCKET_PRIVADO`, `STORAGE_PUBLIC_BASE_URL`. Documenta en `.env.example` y `docs/despliegue.md` el paso a paso para crear los buckets en Supabase (uno **público** `productos` y uno **privado** `privado`) y obtener las claves S3.
- Imágenes públicas (productos, logos, portadas, avatares): bucket público y URL directa.
- **Fotos de cédula: bucket privado**, sin URL pública; el administrador las ve mediante una vista autorizada que las transmite o con **URL firmada de vida corta**. Respeta el ADR-002 y agrega un nuevo ADR-008 con la decisión.
- Pruebas con el almacenamiento local y con un doble de S3 (por ejemplo `moto` o mocks); no dependas de servicios reales en CI.
- Si no hay variables S3 en Render, la app sigue arrancando con almacenamiento local y muestra una advertencia en logs ("medios efímeros").

**1.2 Procesamiento seguro de imágenes al subir (backend)**
- Valida el contenido real con Pillow (no solo la extensión), límites de dimensiones y peso, y rechaza archivos corruptos.
- **Elimina metadatos EXIF** (GPS incluido), corrige la orientación, redimensiona a un máximo (por ejemplo 1600 px de lado largo) y convierte a **WebP** (calidad ~80). Genera una **miniatura** (por ejemplo 400 px). Guarda ambas. El serializer devuelve `url`, `miniatura`, `ancho`, `alto` y `alt`.
- Campos nuevos en `ImagenProducto`: `alt` (texto alternativo, por defecto el nombre del producto), `es_principal` (una sola por producto) y `miniatura`. Endpoints para **reordenar** y **marcar principal**, y límite de imágenes por producto (por ejemplo 6).
- `Puesto`: campos `logo` y `portada` (ImageField opcionales) con el mismo procesamiento. `Usuario`: `avatar` opcional. `Categoria`: campo `icono` (clave de ícono de `lucide-react`, texto, no archivo) y `color` opcional.
- Todo con migraciones, pruebas, y OpenAPI actualizado.

**1.3 Fotos reales para la demo (seed)**
- Crea la carpeta `seed_images/` (versionada, imágenes ya optimizadas en WebP de ~800 px y bajo peso, **menos de 4 MB en total**) con **una a tres fotos por producto** del seed (frutas, pescado, arepas, mochilas wayuu, tejidos, comida típica, etc.) y portada/logo por puesto, nombradas por *slug* del producto.
- **De dónde sacarlas**: usa solo fuentes con licencia que permita uso libre (Pexels o Unsplash). Escribe el script `scripts/descargar_imagenes_demo.py` que, si existe la variable `PEXELS_API_KEY` (clave gratuita), busque por nombre de producto, descargue, optimice (Pillow → WebP), guarde en `seed_images/` y registre fotógrafo, enlace y licencia en `seed_images/CREDITOS.md`. Si no hay clave, **déjame una lista exacta** de qué archivos faltan y sus nombres para que yo los coloque a mano, y que el sistema funcione igual con el respaldo de la fase 1.4. No uses imágenes de marcas, personas identificables ni material con derechos reservados.
- `seed_masivo` y `seed_demo` (idempotentes) asignan esas imágenes por producto/puesto **solo si el producto aún no tiene imágenes**, subiéndolas por el *storage* configurado (local o S3) y sin duplicar al reejecutar. En Render, el arranque (`scripts/render-start.sh`) debe poblar las imágenes **una sola vez** (si faltan), sin ralentizar los arranques siguientes.

**1.4 Respaldo visual cuando no hay foto (frontend)**
- Reemplaza el ícono gris `ImageOff` por un **componente de imagen de reserva atractivo**: degradado de la paleta `brand`/`sand` según la categoría + ícono grande de la categoría + iniciales o nombre, con la misma proporción que las fotos. Úsalo en tarjetas, detalle, carrito, pedidos y paneles.

**1.5 Experiencia de imágenes en el frontend**
- Componente `<Imagen>` único: `aspect-ratio` fijo (sin saltos de diseño), `loading="lazy"` y `decoding="async"`, `srcset`/`sizes` usando `miniatura` y `url`, marcador mientras carga (color de fondo suave o desenfoque), reintento y respaldo si falla la carga.
- **Detalle de producto**: galería con miniaturas, navegación por teclado y gestos, **zoom/lightbox** accesible (foco atrapado, `Esc` cierra), contador "2 de 5" y `alt` correcto.
- **Subida para el vendedor**: arrastrar y soltar, varias a la vez, vista previa, barra de progreso, validación de tipo y tamaño, compresión en el navegador antes de subir (por ejemplo `browser-image-compression`, cargada de forma diferida), reordenar, marcar principal y eliminar con confirmación.
- **Puestos**: logo y portada en `PuestoCard` y en el detalle del puesto; formulario de edición con subida y recorte simple (o `object-cover` bien resuelto).
- **Categorías**: mosaico de categorías en el inicio con ícono/color propio.
- **Perfil**: avatar con iniciales de respaldo.

### FASE 2 (P0) — Visual y UX de la parte pública (lo primero que ve el profesor)
- Hero, categorías, "productos recientes" y "puestos destacados" con las fotos nuevas; tarjetas pulidas (imagen, precio en COP, calificación, insignia "vendedor verificado", indicador de stock "quedan 3", estado "agotado", botón de agregar con animación).
- **Badge "Abierto ahora / Cerrado"** calculado desde el campo `horario` del puesto (si el formato permite interpretarlo; si no, muestra el horario tal cual) y botón **"Pedir por WhatsApp"** en el detalle del puesto (usa el celular del vendedor con mensaje prellenado; es muy relevante en Colombia; respeta la privacidad: solo si el vendedor lo activa).
- Catálogo: filtros laterales en escritorio y panel deslizante en móvil, chips de filtros activos, orden, conteo de resultados, estado vacío con sugerencias, autocompletado de búsqueda (con *debounce*).
- **Conecta de verdad la precarga**: usa `EnlacePrecarga` (precarga el chunk de la ruta y los datos con `prefetchQuery` al pasar el mouse/foco/touch; desactívala con `saveData`) en el menú principal, tarjetas y paginación; o elimina el componente y la promesa del README si decides no usarlo. Transiciones suaves con `viewTransition` y `prefers-reduced-motion`.
- **Pantalla de "despertando el servidor"**: si la primera petición a la API tarda más de 4 s, muestra un aviso amable ("El servidor gratuito estaba dormido, tardará unos segundos…") con reintentos automáticos, en lugar de un error o pantalla en blanco. Esto es clave para la demo en Render gratuito.
- Metadatos por página (título y descripción únicos, `og:title/description/image`), `robots.txt`, `sitemap.xml` básico para las rutas públicas, favicon/manifest (ya existe `public/`; complétalo).

### FASE 3 (P1) — Funcionalidades que faltan
1. **Cuenta**: cambiar contraseña (con la actual), **recuperar contraseña** por correo con token de un solo uso y expiración corta (en desarrollo y en la demo, el enlace se imprime en consola/logs o se muestra en la bandeja de notificaciones si SMTP no está configurado; con límites de peticiones y sin revelar si el correo existe), avatar, y que el vendedor pueda editar el perfil de su puesto.
2. **Favoritos** (productos y puestos): modelo, endpoints, corazón en las tarjetas y página "Mis favoritos".
3. **Mapa de puestos** con Leaflet + OpenStreetMap (carga diferida, sin clave): vista de mapa en el catálogo de puestos y en el detalle (la CSP ya admite `tile.openstreetmap.org`; confírmalo con una prueba en el navegador y ajusta la CSP si hace falta). Opcional: ordenar por cercanía si el navegador da la ubicación (con permiso explícito).
4. **Paneles con datos visuales**: gráficos ligeros en SVG propio o con una librería pequeña cargada de forma diferida: ventas por día y productos más vendidos (vendedor), pedidos por estado y ventas totales (administrador). Alertas de **stock bajo** del vendedor. **Exportar a CSV** pedidos y pagos.
5. **Pedidos**: botón **"Volver a pedir"**, comprobante imprimible del pedido (HTML con estilos de impresión o PDF), y línea de tiempo visual del estado ya existente pulida.
6. **Administración de usuarios** (el roadmap lo menciona como pendiente): listar, filtrar, activar/suspender usuarios desde el panel del administrador (con auditoría de cada acción y sin poder suspenderse a sí mismo).
7. **Notificaciones**: refresco automático periódico (polling con `refetchInterval` inteligente y pausa cuando la pestaña no está visible), sin WebSockets.

### FASE 4 (P1) — Calidad, seguridad y rendimiento
- **Pruebas**: eleva el frontend a una suite seria (formularios, carrito, rutas protegidas, subida de imágenes, manejo de errores, componente `<Imagen>`) y amplía **Playwright** a flujos completos por rol (comprador: buscar → carrito → pedido → pago; vendedor: subir imagen → confirmar/avanzar pedido; admin: aprobar verificación → auditoría) contra el servidor local y, como verificación aparte, contra `https://riomarket.onrender.com` (solo lectura y cuentas demo; sin crear basura). Añade **`@axe-core/playwright`** y corrige violaciones graves. Agrega cobertura con umbral en CI (backend ≥ 85 %, frontend un umbral realista que no baje de lo actual).
- **Warnings**: reduce los ~200 *warnings* de `pytest` a cero o documenta y filtra los inevitables de terceros en `pytest.ini`.
- **Seguridad**: corrige o justifica los avisos críticos y altos de `npm audit` (actualiza dependencias de desarrollo si es seguro); `pip-audit` limpio; revisa límites de peticiones en los endpoints nuevos (subida de imágenes, recuperación de contraseña, favoritos); valida que ninguna respuesta exponga campos internos; revisa que la CSP siga estricta con mapa e imágenes del *storage* (`img-src` con el dominio del bucket); `python manage.py check --deploy` sin advertencias evitables.
- **Rendimiento**: `ETag`/`Cache-Control` en listados públicos de solo lectura; sin N+1 en listados con imágenes (`prefetch_related`, `assertNumQueries`); índices donde haga falta; presupuesto de peso del bundle y análisis con `rollup-plugin-visualizer`. Ejecuta **Lighthouse** (móvil y escritorio) en inicio, catálogo, producto, login y un panel, antes y después, y guarda los **números reales** en `docs/rendimiento.md`. Meta: ≥ 90 en Rendimiento, Accesibilidad, Mejores prácticas y SEO en las páginas públicas.
- **CI**: que corra todo lo anterior (lint, tipos, pruebas, cobertura, build, E2E del servidor local si es viable).

### FASE 5 (P1) — Despliegue y datos en Render
- Mantén Render con un solo servicio. Documenta y prepara **dos rutas de base de datos**: (a) la de Render gratuita (caduca a los 30 días) y (b) **Supabase** (recomendada para que dure) cambiando solo `DATABASE_URL`; agrega al README y a `docs/despliegue.md` un aviso visible con la fecha de caducidad y los pasos de migración a Supabase.
- Con almacenamiento S3 configurado por variables (fase 1.1), verifica en Render que una imagen subida **sobrevive a un redeploy**. Si no puedes probar en Render desde tu entorno, déjalo como lista de verificación para mí.
- Mantén el servicio despierto durante la presentación: documenta cómo configurar un *ping* gratuito (UptimeRobot o cron-job.org) a `/api/health/` cada 10 minutos, sin añadir código que abuse del plan.
- Actualiza `render.yaml` solo con lo necesario (variables de S3 con `sync: false`, sin secretos) y comprueba que sigue funcionando sin ellas.

### FASE 6 (P2) — Detalles de producto y presentación
- **PWA instalable** básica (`vite-plugin-pwa`, sin cachear datos privados ni la API, con aviso de actualización).
- Tema con acento cálido y detalle sutil inspirado en patrones wayuu (sin caricaturizar), modo oscuro revisado.
- Cupones visibles en el inicio como banner de promoción; "Productos relacionados" en el detalle; ordenar por "más vendidos".
- Internacionalización preparada (textos en un diccionario `es-CO`), sin traducir todavía.
- **Material de presentación**: capturas reales en `docs/capturas/` y en el README (galería corta), `docs/PRESENTACION.md` con guion de 5 minutos y 8 preguntas probables del profesor con respuestas veraces, y un GIF corto del flujo principal si es viable.

## Documentación que debes actualizar al final
README (funcionalidades, capturas, variables nuevas, advertencias de Render y de almacenamiento), `README.en.md`, `frontend/README.md`, `.env.example` (variables S3 y `PEXELS_API_KEY`), `docs/despliegue.md`, `docs/arquitectura.md` (ERD con los campos nuevos), `docs/api-ejemplos.md` (endpoints nuevos), `SEGURIDAD.md` (procesamiento de imágenes, buckets, recuperación de contraseña), ADR-008 (almacenamiento y imágenes) y `seed_images/CREDITOS.md`. Cada afirmación debe estar verificada ejecutando lo descrito.

## Lo que me tocará hacer a mí (déjame la lista exacta al terminar)
- Crear los buckets en Supabase y pegar las claves S3 como variables en el panel de Render (nunca en el repositorio).
- Conseguir (opcional) una `PEXELS_API_KEY` gratuita o colocar las fotos que falten en `seed_images/`.
- Hacer el push y verificar el redeploy en Render; configurar el *ping* para que no se duerma.
- Decidir la licencia del repo.

## Si el tiempo se acaba, prioriza así
Fase 1 completa (imágenes durables, procesadas y con fotos en la demo) → Fase 2 (visual público y pantalla de "servidor despertando") → de la Fase 3: recuperación y cambio de contraseña, favoritos, mapa y gráficos → Fase 4 (pruebas, axe, Lighthouse) → Fase 5 → Fase 6. Nunca dejes una fase a medias que no compile o rompa pruebas.

## Definición de terminado
- El catálogo de `https://riomarket.onrender.com/` se ve con **fotos reales** en productos y puestos, con respaldo visual atractivo cuando falte una; las imágenes subidas **persisten** tras un redeploy (si S3 está configurado) y se sirven optimizadas, sin metadatos EXIF.
- La cédula sigue privada; nada sensible queda en un bucket público.
- Las funcionalidades de las fases 1 a 3 que logres funcionan para los tres roles y tienen pruebas.
- `pytest`, `ruff`, `makemigrations --check`, `spectacular --validate`, `npm run lint/typecheck/test/build` y los E2E en verde; CI en verde; `axe` sin violaciones graves; Lighthouse ≥ 90 en las páginas públicas con números reales guardados.
- Documentación y capturas al día; sin marcadores "pendiente".
- Mensaje final (máx. 20 líneas): qué se hizo por fase, números antes/después (pruebas, Lighthouse, peso de imágenes), qué quedó pendiente, qué decisiones tomaste, y la lista de pasos manuales que me tocan.
