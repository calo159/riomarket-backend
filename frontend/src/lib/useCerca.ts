import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * ¿Está el elemento a la vista, o a menos de `margen` px de estarlo? Devuelve `[ref, cerca]`. Sirve para no pedir ni
 * animar lo que está lejos de la pantalla (una sección del final de la página, la portada ya pasada). Donde no hay
 * `IntersectionObserver` (las pruebas, navegadores muy viejos) se considera siempre cerca: nunca se queda sin cargar.
 * Una vez cerca con `unaVez`, ya no vuelve a «lejos» (lo pedido no se des-pide).
 */
export function useCerca<T extends Element>(margen = 400, unaVez = false): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [cerca, setCerca] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setCerca(true);
          if (unaVez) observador.disconnect();
        } else if (!unaVez) {
          setCerca(false);
        }
      },
      { rootMargin: `${margen}px 0px` },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [margen, unaVez]);

  return [ref, cerca];
}
