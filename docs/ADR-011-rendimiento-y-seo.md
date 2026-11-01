# ADR-011: rendimiento de la entrega y SEO

Estado: aceptado.

## Contexto

Lighthouse móvil (perfil por defecto de Lighthouse 12: Moto G Power emulado, 4G lento, CPU ×4) medía la tienda en rendimiento 69 con un LCP de 4,5 s, y el SEO en 91 porque `/robots.txt` devolvía el HTML de la aplicación. La primera medición de este paquete sobre el build servido por Django con WhiteNoise confirmó el problema y encontró otros (ver [rendimiento.md](rendimiento.md)). La aplicación es una SPA de React servida por Django, sin renderizado en el servidor; el servicio vive en Render (plan gratuito) y las fotos en Supabase Storage.

## Decisiones

### 1. El build se entrega comprimido

- WhiteNoise solo responde `.br`/`.gz` si existen junto al archivo. `collectstatic` comprime `STATIC_ROOT`, pero el build de Vite se sirve desde `WHITENOISE_ROOT = frontend/dist`, que nadie comprimía: el JS y el CSS iban en crudo (≈ 440 kB).
- `Dockerfile.render` ejecuta `python -m whitenoise.compress frontend/dist` tras copiar el build. Genera Brotli y gzip; WhiteNoise omite por sí solo lo ya comprimido (woff2, webp, png). Se añade `Brotli` a `requirements.txt` (sin él solo habría gzip).
- Si el proxy de Render ya comprimía por su cuenta, el cambio no empeora nada: WhiteNoise entrega el archivo ya comprimido con `Content-Encoding`.

### 2. Caché inmutable solo para lo que lleva hash

- WhiteNoise marca `immutable` lo que cumple su prueba por defecto (hash hexadecimal de 12 caracteres de Django). Los nombres de Vite (`index-CgUCPP6x.js`, 8 caracteres en base64url) no la cumplen y salían con `max-age=60`.
- `WHITENOISE_IMMUTABLE_FILE_TEST = r"^/assets/.+-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$"`: solo lo que vive en `assets/` y termina en `-<8 caracteres>.<extensión>`. Quedan fuera, a propósito, `sw.js`, `manifest.webmanifest`, `theme-init.js`, `offline.*` e `index.html`: un service worker o un HTML inmutables dejarían versiones viejas durante años. Hay pruebas con casos positivos y negativos (`tests/test_rendimiento_estaticos.py`).
- WhiteNoise usa «para siempre» = 10 años (`max-age=315360000`), no un año. Es equivalente en la práctica.
- `index.html` se responde con `Cache-Control: no-cache`: el navegador lo revalida siempre y toma los nuevos nombres con hash tras un despliegue.

### 3. Miniaturas reales y `srcset`

- Las tarjetas cargaban siempre la foto grande. Las fotos de demostración nacieron **sin miniatura ni medidas** (`seed_imagenes_demo` creaba la fila solo con el archivo), de modo que el serializer devolvía la URL grande también como «miniatura». Las subidas de los vendedores sí pasan por `agregar_imagen` (WebP, 1600 px máx., miniatura de 400 px).
- `catalog.services.preparar_archivos_imagen` es ahora el único punto que decide cómo se procesa una foto de producto (la usa `agregar_imagen`). Para las fotos demo, que ya vienen optimizadas, `miniatura_y_medidas` conserva el archivo original byte a byte y solo añade miniatura y medidas: no se vuelve a comprimir una foto que ya está comprimida.
- `seed_imagenes_demo` crea las fotos nuevas con miniatura y medidas, y el comando idempotente `generar_miniaturas` repara las existentes (sin miniatura o con `ancho` nulo; `--dry-run`, `--limite`; salta las que perdieron su archivo por el disco efímero). `scripts/render-start.sh` lo corre al arrancar, acotado a 200 imágenes, y con `|| true` para que nunca impida abrir el puerto.
- La tarjeta usa la miniatura como `src` y ofrece la grande en el `srcset` para pantallas de alta densidad, con `sizes` según la rejilla. Reserva 400 × 400 (las tarjetas son cuadradas), de modo que no hay saltos de diseño. El carrito guarda la miniatura (muestra fotos de 64 px). El detalle del producto sigue mostrando la grande, con prioridad y `srcset`.
- Fotos de puesto (`logo`, `portada`): solo las pone el seed (no hay subida desde la app). Quedan como están (640 px). **Si algún día se suben desde la aplicación deben pasar por el mismo procesado.**

### 4. Prioridad de las imágenes

- `Imagen` acepta `prioridad`: `loading="eager"`, `fetchpriority="high"` y `decoding="async"`. `fetchpriority` va en minúsculas porque React 18 aún no conoce `fetchPriority` y avisa en consola (igual que ya hacía la landing).
- Catálogo: las dos primeras tarjetas usan prioridad alta y las seis primeras (unas tres filas en celular, lo que se ve sin desplazarse) se piden de inmediato (`loading="eager"`, prioridad normal); el resto sigue diferido. Con solo dos, la medición mostró que el elemento LCP del catálogo seguía siendo una foto con `loading="lazy"` (auditoría `lcp-lazy-loaded`). En la tienda ninguna tarjeta: el candidato a LCP es el carrusel.
- Carrusel `Destacados`: antes pintaba las cuatro portadas a la vez, sin prioridad ni medidas, y la visible competía con las tres ocultas. Ahora solo la visible tiene `<img>`; la siguiente espera a que la visible termine de cargar (o falle); las ya vistas lo conservan; las lejanas no se pintan. La primera diapositiva es la prioritaria. Se mantienen `aria-*`, pausa, `prefers-reduced-motion` y la transición de opacidad.

### 5. Los datos se piden mientras se descarga el código

- Cascada original en `/tienda`: HTML → JS principal → chunk diferido de `Inicio` → recién ahí las consultas → fotos. `main.tsx` llama a `precargarRuta` antes de renderizar: en `/tienda` y en `/catalogo` sin filtros pide los datos con `prefetchQuery` en paralelo con el chunk.
- Las definiciones de esas consultas viven en `pages/inicio/consultas.ts` y las usan tanto las pantallas como la precarga; así no pueden desalinearse (una prueba renderiza `Inicio` y `Catalogo` tras la precarga y comprueba que no vuelven a pedir nada). Solo rutas públicas: nunca se precarga algo que dependa de la sesión.

### 6. Pista de sesión: la landing no espera al servidor

- `SessionProvider` empezaba en `cargando` y hacía `POST /api/auth/token/refresh/` + `GET /api/auth/perfil/` aunque el visitante fuera anónimo (un viaje que terminaba en 401 y un error en consola). La landing mostraba una pantalla de carga hasta entonces y la foto LCP se descubría después.
- Ahora el servidor pone, junto a `rm_refresh` (HttpOnly, `path=/api/auth/`), la cookie **`rm_hay_sesion=1`**: no HttpOnly, `path=/`, mismo `max_age`, `secure` y `samesite`. Se borra donde se borra `rm_refresh` (cierre de sesión) y cuando el refresh responde 401 (inválido, vencido o ausente). El frontend arranca como `anonimo` si no la ve, y con la sesión por restaurar (`cargando`) si la ve.
- **Por qué no expone nada:** vale `1`, no identifica a nadie ni sirve para autenticar; solo dice «hay una cookie de refresco». Un script malicioso que la lea no gana nada que ya no supiera (si hay sesión). La autenticación sigue siendo el refresh HttpOnly y el JWT en memoria; la CSP estricta se mantiene.
- Si la API estuviera en otro dominio (`VITE_API_URL` con otro host) la cookie no sería legible desde la página y el frontend ignora la pista (siempre intenta restaurar), como antes.
- **Consecuencia aceptada (decisión 14 del plan):** las sesiones iniciadas antes de este cambio no tienen la pista. Esos usuarios aparecen como anónimos **una sola vez** y deben volver a iniciar sesión (su cookie de refresco sigue válida hasta vencer, pero la página no la intenta). El aviso queda aquí, en el [CHANGELOG](../CHANGELOG.md) y en `docs/despliegue.md`.

### 7. Fuente precargada

Un plugin pequeño de Vite (`precargaDeFuente`) añade `<link rel="preload" as="font" crossorigin>` de `figtree-latin-wght-normal-*.woff2` con el nombre con hash que genera el build. Sin CDN (la CSP solo permite `font-src 'self' data:`). `theme-init.js` sigue síncrono y sin cambios (evita el destello del tema).

### 8. SEO: robots, sitemap y metaetiquetas

- `GET /robots.txt` (`text/plain`, caché pública de 1 h): permite todo salvo `/api/`, `/admin/` y las pantallas con sesión o privadas (`/vendedor`, `/checkout`, `/carrito`, `/pedidos/`, `/mis-pedidos`, `/direcciones`, `/notificaciones`, `/perfil`), y apunta a `Sitemap:` con el origen real de la petición (detrás de Render ya existe `SECURE_PROXY_SSL_HEADER`).
- `GET /sitemap.xml` con `django.contrib.sitemaps` (no requiere `django.contrib.sites`; no crea tablas ni migraciones): `/`, `/tienda`, `/catalogo`, `/mapa`, los puestos activos y los productos activos de puestos activos (tope de 5000). Sin `lastmod`: los modelos no tienen fecha de modificación y no se inventa. Cuatro consultas, las mismas con 1 que con 20 productos (prueba `test_sitemap_hace_consultas_constantes`).
- `index.html` lleva Open Graph, `twitter:card` y `canonical`. Django lo lee una vez por proceso (se relee si cambia su fecha de modificación) y sustituye los marcadores `__…__` en **una sola pasada** (un nombre de producto que contenga «`__ORIGEN__`» no se vuelve a sustituir), con todo escapado. En `/productos/<id>` y `/puestos/<id>` usa nombre, descripción (150 caracteres) y foto del objeto, con **una** consulta y **solo si es público** (producto activo de puesto activo; puesto activo). Si no existe o no es público devuelve las metaetiquetas genéricas: desde aquí nunca hay 404 (la decide la SPA) y no se filtra un producto bloqueado.
- **Por qué no SSR:** el beneficio buscado (vistas previas al compartir por WhatsApp y rastreo básico) solo necesita el HTML inicial con unas pocas metaetiquetas; un servidor de renderizado en Render gratis añadiría un proceso, memoria y arranque en frío para un contenido que Google ya ejecuta. Las metaetiquetas por ruta desde Django cuestan una consulta.
- Con `npm run dev` Vite no pasa por Django: los marcadores se ven literales en las vistas previas. Solo afecta a desarrollo.
- `frontend/public/og-riomarket.png` (1200 × 630, fondo turquesa plano, símbolo, «Rio» blanco y «Market» amarillo en Figtree 800) se genera con `node frontend/scripts/exportar-marca.mjs`, junto con los íconos de la app, a partir de los SVG de `frontend/public/brand/`.
- La CSP **no cambia**: las metaetiquetas no ejecutan nada (prueba con comparación exacta de la cabecera).

## Consecuencias

- Compresión y caché cambian el despliegue: el build de Docker ejecuta un paso más (segundos) y el arranque, `generar_miniaturas` (idempotente, acotado).
- Las sesiones anteriores al cambio se cierran una vez (ver decisión 6).
- Lo medido en local con WhiteNoise es una aproximación: en producción las fotos vienen de Supabase (otro origen, otra latencia) y Render gratis tiene arranque en frío. Los números reales de producción deben medirse tras el despliegue (ver [rendimiento.md](rendimiento.md)).
- Limitación conocida: WhiteNoise entrega también `/index.html` tal cual está en el build (con los marcadores `__…__` sin completar). Ningún enlace ni el sitemap apuntan ahí; las rutas de la aplicación siempre pasan por Django.
- No hay JSON-LD en este paquete.
