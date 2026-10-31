# Rendimiento: Lighthouse antes y después

Medición del paquete de rendimiento y SEO ([ADR-011](ADR-011-rendimiento-y-seo.md)). Lo medido es
**local** y es una aproximación a producción (ver «Qué no se midió»).

## Resultado

Lighthouse 12.8.2, móvil, configuración por defecto (Moto G Power emulado, 4G lento simulado, CPU ×4),
3 corridas por página y por estado; se muestra la **mediana** (entre corchetes, las tres corridas de
rendimiento). Fecha: 30/10/2026. Servidor: build de producción servido por Django con la configuración de
`config.settings.prod` (WhiteNoise sirviendo `frontend/dist`), SQLite local con el seed.

| Página | Estado | Rendimiento | Accesib. | Buenas prácticas | SEO | LCP | TBT | CLS | FCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` (landing) | antes (`b319761`) | **79** [77, 79, 79] | 97 | 96 | 92 | 4,13 s | 108 ms | 0 | 3,36 s |
| `/` (landing) | después (serie 1) | **97** [89, 97, 97] | 97 | 100 | 100 | 2,35 s | 54 ms | 0 | 1,86 s |
| `/` (landing) | después (serie 2) | **97** [91, 97, 97] | 97 | 100 | 100 | 2,32 s | 45 ms | 0 | 1,84 s |
| `/tienda` | antes (`b319761`) | **67** [67, 72, 64] | 100 | 96 | 92 | 4,69 s | 310 ms | 0 | 3,40 s |
| `/tienda` | después (serie 1) | **94** [85, 96, 94] | 100 | 100 | 100 | 2,24 s | 183 ms | 0 | 1,98 s |
| `/tienda` | después (serie 2) | **94** [92, 97, 94] | 100 | 100 | 100 | 2,28 s | 199 ms | 0 | 1,93 s |
| `/catalogo` | antes (`b319761`) | **70** [71, 70, 69] | 100 | 96 | 92 | 4,96 s | 221 ms | 0 | 3,41 s |
| `/catalogo` | después (serie 1) | **91** [85, 91, 92] | 100 | 100 | 100 | 2,79 s | 218 ms | 0 | 1,74 s |
| `/catalogo` | después (serie 2) | **91** [89, 91, 91] | 100 | 100 | 100 | 2,76 s | 214 ms | 0 | 1,74 s |

Lectura honesta:

- **Rendimiento ≥ 90 en las tres páginas** en las dos series (medianas 97, 94 y 91). El catálogo queda justo
  en el umbral y una corrida de cada serie estuvo por debajo (85 y 89): la variación entre corridas es de
  varios puntos, sobre todo por el TBT (tareas largas del hilo principal en una máquina de escritorio con la
  CPU «throttleada» ×4). No se debe prometer 90 estable en el catálogo.
- **LCP ≤ 2,5 s** se cumple en landing y tienda, **no en el catálogo** (2,76–2,79 s).
- **CLS 0** en todas.
- **SEO 100** en las tres (era 92: `robots.txt` devolvía HTML) y **buenas prácticas 100** (era 96: el
  `POST /api/auth/token/refresh/` del visitante anónimo terminaba en 401 y quedaba como error en consola).
- **Accesibilidad de la landing: 97, igual que antes** (no empeoró, pero tampoco está en 100). El fallo es
  `color-contrast` en los `<h3>` de «De pendiente a entregado»: el diseño los muestra en gris claro
  (`#c6cacc`, contraste 1,65) hasta que el desplazamiento los «enciende» (`animation-timeline: view()` en
  `Landing.module.css`). Corregirlo cambia el diseño visual; no se tocó. Tienda y catálogo siguen en 100.
- Peso transferido por página (mediana, Lighthouse `total-byte-weight`): landing 572 → 242 KiB, tienda
  2333 → 1576 KiB, catálogo 1222 → 524 KiB. Speed Index: 3,4 → 1,7–2,0 s.

Los reportes JSON completos (9 corridas por estado) no se versionan; viven en el directorio de trabajo de la
medición.

## Tamaños del build (`frontend/dist/assets`, bytes)

| Archivo | Sin comprimir antes | Sin comprimir después | gzip | Brotli |
| --- | --- | --- | --- | --- |
| `index-*.js` | 65 932 | 67 395 | 20 752 | 18 015 |
| `vendor-react-*.js` | 141 887 | 141 887 | 45 479 | 39 943 |
| `vendor-datos-*.js` | 86 860 | 86 860 | 29 503 | 26 740 |
| `vendor-router-*.js` | 39 137 | 39 137 | 14 094 | 12 686 |
| `index-*.css` | 80 403 | 80 403 | 13 317 | 10 777 |

Antes **ninguno** de esos archivos se entregaba comprimido (cabecera sin `Content-Encoding`). El único cambio
en el código del bundle principal es +1,4 kB (precarga de datos, pista de sesión y consultas compartidas).

## Causas de la especificación: qué se confirmó con medición

| # | Causa | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | JS/CSS sin comprimir | **Confirmada** | `curl -I -H 'Accept-Encoding: br,gzip'` sin `Content-Encoding`; Lighthouse `uses-text-compression` (≈ 300 KiB). Después: `Content-Encoding: br`/`gzip`. |
| 2 | Caché de 60 s en assets con hash | **Confirmada** | `Cache-Control: max-age=60, public`; auditoría `uses-long-cache-ttl`. Después: `max-age=315360000, public, immutable`. |
| 3 | Tarjetas con la foto grande / sin miniaturas | **Confirmada** | `uses-responsive-images` (≈ 547 KiB) e `image-delivery-insight` (≈ 684 KiB) en el catálogo; la base demo tenía 41 fotos sin miniatura ni medidas. Después: 16 miniaturas y 0 fotos grandes de producto en la tienda. |
| 3b | (Nueva) El LCP del catálogo era una foto con `loading="lazy"` | **Hallazgo de la medición** | Auditoría `lcp-lazy-loaded`; «retraso de carga» del 75 % del LCP. Llevó a pedir de inmediato las 6 primeras tarjetas (la spec decía 2). |
| 4 | Carrusel con 4 portadas a la vez | **Confirmada por código y por el DOM**, efecto aislado **no medido** | Antes se pintaban 4 `<img>`; ahora 1 al abrir (2 cuando la primera termina). No hay una medición que aísle solo este cambio. |
| 5 | Cascada de datos | **Parcial** | El orden de las peticiones cambió (los datos salen en paralelo con el chunk; una prueba verifica que la pantalla no repite lo precargado). El efecto aislado en el tiempo **no se midió**. |
| 6 | La landing esperaba la sesión | **Confirmada** | Playwright: antes `POST …/token/refresh/` en `/`, `/tienda` y `/catalogo` aun sin sesión; después, ninguno. `errors-in-console` (401) desaparece y buenas prácticas pasa de 96 a 100. |
| 7 | Fuente sin precarga | **No medida por separado** | Se añadió el `preload`; no hay evidencia aislada de su efecto. |
| 8 | SEO 91 por `robots.txt` | **Confirmada** | Auditoría `robots-txt`: 22 errores (era HTML). Después: SEO 100. |

## Método de medición

Reproducible en Windows (Git Bash). La medición **no** usa el servidor de desarrollo.

1. Datos: `python manage.py seed_masivo`, `python manage.py seed_imagenes_demo` y
   `python manage.py generar_miniaturas` sobre la base local (SQLite).
2. Build con las mismas variables que `Dockerfile.render`. **Importante:** `frontend/.env` define
   `VITE_API_URL=http://127.0.0.1:8000`; si se construye así, la página pide la API en otro origen y la CSP
   (`connect-src 'self'`) bloquea las peticiones. Para medir como en producción:
   ```bash
   cd frontend
   VITE_API_URL= VITE_DEMO_MODE=true VITE_SANDBOX_PAGOS=true VITE_TARIFA_DOMICILIO=3000 npm run build
   cd .. && python -m whitenoise.compress frontend/dist      # lo que hace el Dockerfile
   ```
   (La línea base se midió sin el paso `whitenoise.compress`, que es como estaba el despliegue.)
3. Servir con la configuración de producción (WhiteNoise sirve `frontend/dist`), en un puerto aparte:
   ```bash
   DJANGO_SETTINGS_MODULE=config.settings.prod SECRET_KEY=<50+ caracteres> \
   ALLOWED_HOSTS=127.0.0.1,localhost SECURE_SSL_REDIRECT=false SECURE_HSTS_SECONDS=0 \
   python manage.py runserver 127.0.0.1:8001 --noreload
   ```
   WhiteNoise lista los archivos al arrancar: hay que reiniciar el servidor después de cada build.
4. Lighthouse, 3 corridas por URL y mediana. En esta máquina, Chrome «nuevo» headless falla con
   `NO_NAVSTART` y el binario completo de Playwright no sirve para `--headless=old`: se usa el
   `chrome-headless-shell` de Playwright:
   ```bash
   export CHROME_PATH="$USERPROFILE/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe"
   npx -y lighthouse@12 http://127.0.0.1:8001/tienda --output=json --output-path=tienda-1.json \
     --chrome-flags="--headless=old --no-sandbox"
   ```
5. Comprobaciones con `curl`:
   ```bash
   curl -sI -H 'Accept-Encoding: br,gzip' http://127.0.0.1:8001/assets/<archivo-con-hash>.js
   curl -s  http://127.0.0.1:8001/robots.txt
   curl -s  http://127.0.0.1:8001/sitemap.xml | head
   curl -s  http://127.0.0.1:8001/productos/<id> | grep -E 'og:|canonical'
   ```

## Qué no se midió

- **Producción.** Render (plan gratuito) y Supabase Storage no se probaron. En producción las fotos vienen de
  otro dominio (conexión TLS adicional, otra latencia) y el servicio tiene arranque en frío (la primera
  petición tras dormir tarda ~1 min y no la mide este método). No se prometen las notas de producción: hay
  que repetir la medición sobre la URL desplegada (`curl /api/health/` para despertarlo y luego
  `npx lighthouse@12 https://<host>/tienda`, 3 corridas).
- No se verificó si el proxy de Render ya comprimía por su cuenta; si lo hacía, la ganancia de la
  compresión en producción será menor que la medida aquí (donde Django es quien responde directamente).
- La red de Lighthouse es **simulada** (Lantern) a partir de una carga sin limitar: sirve para comparar,
  no para predecir milisegundos reales en un celular.
- El efecto individual de cada cambio (carrusel, precarga de datos, precarga de fuente) no se aisló; las
  cifras son del conjunto.
- La vista previa real en WhatsApp o en `opengraph.xyz` no se probó (requiere una URL pública): solo se
  comprobó el HTML con `curl` y en las pruebas.
