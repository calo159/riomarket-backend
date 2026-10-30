/**
 * Registra el service worker mínimo (página sin conexión). Solo en producción: en desarrollo
 * un service worker estorba al recargar. Si el navegador no lo soporta o el registro falla, la
 * aplicación funciona igual.
 */
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  try {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
      } catch {
        /* sin service worker: la tienda sigue funcionando */
      }
    });
  } catch {
    /* entorno sin ventana o sin permisos */
  }
}
