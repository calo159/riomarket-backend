/** Nombre que comparten la foto de la tarjeta y la de la ficha para que el navegador las una en una sola. */
export const FOTO_COMPARTIDA = 'foto-producto';

const ESPERA_MAXIMA_MS = 300;

/**
 * Navega a la ficha haciendo que la foto de la tarjeta «viaje» hasta su lugar en la ficha.
 *
 * Devuelve `false` (sin hacer nada) si el navegador no soporta transiciones de vista o la persona pidió
 * menos movimiento: entonces se navega como siempre. La página se detiene un instante como máximo
 * (300 ms) esperando a que la ficha pinte su foto; si no llega, la transición sigue sin ella.
 */
export function abrirConFotoCompartida(foto: HTMLElement | null, navegar: () => void): boolean {
  if (!foto || typeof document.startViewTransition !== 'function') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;

  // El nombre debe ser único en la página: solo lo lleva la tarjeta clicada, y solo mientras dura el viaje.
  foto.style.viewTransitionName = FOTO_COMPARTIDA;
  const transicion = document.startViewTransition(async () => {
    navegar();
    const limite = performance.now() + ESPERA_MAXIMA_MS;
    while (!document.querySelector(`[data-vt="${FOTO_COMPARTIDA}"]`) && performance.now() < limite) {
      await new Promise((resolver) => setTimeout(resolver, 16));
    }
  });
  void transicion.finished.finally(() => foto.style.removeProperty('view-transition-name'));
  return true;
}
