# ADR-010: contacto por WhatsApp, mapa y app instalable

Estado: aceptado.

## Contexto

La tienda necesitaba tres cosas que no tocan pedidos ni pagos: que el comprador pueda escribirle al vendedor, ver dónde queda cada puesto y poder instalar la aplicación en el celular. Las tres tienen un riesgo propio: exponer un teléfono, depender de un proveedor de mapas y servir versiones viejas de la aplicación.

## Decisiones

### 1. El celular del vendedor es privado salvo que él lo active

- `Puesto.acepta_whatsapp` ya existía con `default=True` y no se publicaba en ningún lado: nadie lo había decidido. Se cambia a `False` y la migración de datos `catalog.0006` lo pone en `False` en todos los puestos existentes. La marcha atrás no restaura el valor anterior (era un valor por defecto, no una elección).
- La API publica `whatsapp` solo en el serializer del puesto, y solo si se cumplen **todas** estas condiciones: el vendedor activó el interruptor, el puesto está `activo`, el vendedor está activo y su verificación está `aprobada`, y el celular tiene 10 dígitos. En otro caso el campo es `null`. Una única función (`catalog.services.numero_whatsapp_publico`) decide, y hay pruebas de que ni los listados de productos, ni los pedidos, ni las reseñas devuelven el celular.
- Se devuelve el número (`57` + 10 dígitos) y no una URL: es un dato, no presentación. El frontend arma el enlace `https://wa.me/<número>?text=...` con el mensaje codificado y solo si el valor son dígitos, de modo que un valor inesperado nunca se vuelve un enlace. Se abre en pestaña nueva con `rel="noopener noreferrer"`.
- Solo el dueño puede cambiar `acepta_whatsapp` (mismos permisos que el resto de la edición del puesto).
- Los puestos de `seed_masivo` quedan con el contacto activo porque sus celulares son ficticios; el seed los repone en cada despliegue.

### 2. Mapa: Leaflet con teselas de OpenStreetMap

- **Leaflet** pesa ~150 kB (44 kB comprimido), no pide claves ni cuenta, y funciona con la CSP actual (`script-src 'self'`; las teselas son imágenes de `tile.openstreetmap.org`, ya permitidas en `img-src`). No se necesitó cambiar la CSP.
- Alternativas descartadas: **Google Maps** (clave, facturación y scripts externos que obligarían a abrir la CSP), **Mapbox/MapLibre GL** (token y mucho más peso, WebGL), **un iframe de OpenStreetMap** (sin marcadores propios y sin control sobre la lista accesible).
- Leaflet y su CSS viven en un chunk diferido: no entran en la landing ni en la tienda. Si el chunk falla, la página muestra la lista de puestos con un aviso; el mapa nunca es la única forma de llegar a un puesto.
- Marcadores con `L.divIcon` y CSS propio (sin los PNG de Leaflet). Las tarjetas se construyen con nodos de texto, no con HTML, porque los nombres los escriben los vendedores.
- Límites asumidos: las teselas públicas de OSM son para uso moderado; si el tráfico crece habría que usar un proveedor de teselas propio. «Cómo llegar» abre direcciones en OpenStreetMap (y Google Maps como segunda opción) sin llamar a ningún servicio desde el servidor.

### 3. Service worker mínimo, sin caché de la aplicación

- `sw.js` precachea únicamente `offline.html` y `offline.js` y solo responde a **navegaciones** que fallan por falta de red. No guarda JS, CSS, imágenes ni la API. Así, tras un despliegue nadie ve una versión vieja, y los datos sensibles (stock, pedidos, pagos) nunca salen de una caché.
- Se registra solo en producción y dentro de `try/catch`; si falla, la aplicación sigue igual.
- Es un archivo real en la raíz (`/sw.js`, `/offline.html`, `/manifest.webmanifest`, `/icons/*`). El servidor devuelve `index.html` con 200 para rutas desconocidas, así que `config/urls.py` entrega esos archivos antes del catch-all (404 si faltan) y WhiteNoise recibe el tipo `application/manifest+json` para el manifest.
- La CSP actual lo permite sin cambios: `worker-src` y `manifest-src` caen en `default-src 'self'`. El botón «Reintentar» de la página sin conexión usa un script externo (`offline.js`) porque la CSP no admite scripts en línea.
- Consecuencia: la app es instalable pero **no funciona sin conexión**; solo informa que no hay red.
