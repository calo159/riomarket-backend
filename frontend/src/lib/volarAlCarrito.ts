/**
 * Animación de «agregar al carrito»: una miniatura sale del botón, hace un arco y se
 * achica hasta el icono del carrito. Se desactiva con prefers-reduced-motion y no toca
 * el estado del carrito (solo decora).
 */
export const DESTINO_CARRITO = 'data-carrito-destino';

function destinoVisible(): HTMLElement | null {
  const candidatos = Array.from(document.querySelectorAll<HTMLElement>(`[${DESTINO_CARRITO}]`));
  return (
    candidatos.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

export function volarAlCarrito(origen: Element | null, imagen?: string | null): void {
  if (!origen || typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const destino = destinoVisible();
  if (!destino) return;

  const o = origen.getBoundingClientRect();
  const d = destino.getBoundingClientRect();
  const tamano = 54;
  const x = o.left + o.width / 2 - tamano / 2;
  const y = o.top + o.height / 2 - tamano / 2;

  const volador = document.createElement('div');
  volador.setAttribute('aria-hidden', 'true');
  volador.className = 'volador fixed z-[120] overflow-hidden rounded-lg bg-white shadow-menu pointer-events-none';
  volador.style.cssText = `left:${x}px;top:${y}px;width:${tamano}px;height:${tamano}px;--dx:${
    d.left + d.width / 2 - tamano / 2 - x
  }px;--dy:${d.top + d.height / 2 - tamano / 2 - y}px`;
  if (imagen) {
    const img = document.createElement('img');
    img.src = imagen;
    img.alt = '';
    img.className = 'h-full w-full object-cover';
    volador.appendChild(img);
  } else {
    volador.className += ' bg-accion';
  }
  document.body.appendChild(volador);
  const quitar = () => volador.remove();
  volador.addEventListener('animationend', quitar, { once: true });
  window.setTimeout(quitar, 1200);
}
