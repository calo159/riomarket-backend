/**
 * ¿Conviene esperar a que termine una animación de salida antes de quitar algo de la pantalla? No si la persona pidió
 * «reducir movimiento» (las animaciones están apagadas) ni donde no hay `matchMedia` (las pruebas): ahí se quita de una vez.
 */
export function hayMovimiento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Lo que dura la animación de salida de avisos y ventanas (un poco menos que la de entrada). */
export const SALIDA_MS = 170;
