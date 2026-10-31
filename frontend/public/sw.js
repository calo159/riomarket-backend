/*
 * Service worker mínimo de RioMarket.
 *
 * NO guarda en caché la aplicación (JS, CSS, imágenes) ni la API: así nadie ve una versión vieja
 * después de un despliegue y los datos (stock, pedidos, pagos) siempre vienen del servidor.
 * Lo único que hace es guardar la página «sin conexión» y mostrarla cuando una navegación falla
 * por falta de red.
 */
const CACHE = 'riomarket-sin-conexion-v1';
const PAGINA_SIN_CONEXION = '/offline.html';
// Recursos de la propia página sin conexión. Nada más se precachea.
const PRECACHE = [PAGINA_SIN_CONEXION, '/offline.js'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  // Navegaciones: red primero; sin red, la página sin conexión.
  if (peticion.mode === 'navigate') {
    evento.respondWith(fetch(peticion).catch(() => caches.match(PAGINA_SIN_CONEXION)));
    return;
  }

  // El script de la página sin conexión también debe cargar sin red.
  const { pathname, origin } = new URL(peticion.url);
  if (origin === self.location.origin && pathname === '/offline.js') {
    evento.respondWith(fetch(peticion).catch(() => caches.match(peticion)));
  }
  // Todo lo demás (assets, /api, /media) no pasa por aquí: lo resuelve el navegador con la red.
});
