import { useEffect, useRef } from 'react';

/**
 * Revela una sección cuando el visitante llega a ella (estilos `.rv` y `[data-revela]` en index.css).
 *
 * El contenido es visible por defecto: solo se oculta lo que está debajo de la pantalla inicial y solo
 * si el navegador sabe observar y la persona no pidió menos movimiento. Si algo falla, nada queda oculto.
 */
export function useRevelar<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Ya está a la vista (arriba de la página o al volver con el scroll guardado): no se oculta.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    el.dataset.revela = 'oculto';
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        el.dataset.revela = 'visto';
        observador.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      delete el.dataset.revela;
    };
  }, []);

  return ref;
}
