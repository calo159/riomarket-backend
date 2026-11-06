import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface OpcionSegmentada<T extends string> {
  valor: T;
  etiqueta: string;
  /** Id del botón (para que un panel pueda decir que lo nombra con `aria-labelledby`). */
  id?: string;
  /** Id del panel que controla esta opción. */
  controla?: string;
}

/**
 * Selector de vista de dos o tres opciones (Lista / Matriz, Gráfico / Tabla). La opción elegida lleva una pastilla que
 * se desliza hasta la nueva en vez de apagarse en una y encenderse en otra. La primera vez se coloca sin animar y se
 * vuelve a medir si cambia el ancho. Son pestañas (`role="tablist"`): cada botón es un `tab` con `aria-selected`.
 */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
  className,
}: {
  opciones: OpcionSegmentada<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  etiqueta: string;
  className?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const pastilla = useRef<HTMLSpanElement>(null);
  const [animar, setAnimar] = useState(false);

  const medir = useCallback(() => {
    const activo = contenedor.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const pieza = pastilla.current;
    if (!activo || !pieza) return;
    // `offset*` mide el diseño: no cuenta lo que una animación esté desplazando en ese momento.
    pieza.style.width = `${activo.offsetWidth}px`;
    pieza.style.transform = `translateX(${activo.offsetLeft}px)`;
  }, []);

  useLayoutEffect(() => {
    medir();
    const cuadro = requestAnimationFrame(() => setAnimar(true));
    return () => cancelAnimationFrame(cuadro);
  }, [valor, medir]);

  useEffect(() => {
    const cont = contenedor.current;
    if (!cont) return undefined;
    window.addEventListener('resize', medir);
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(cont);
    return () => {
      window.removeEventListener('resize', medir);
      observador?.disconnect();
    };
  }, [medir]);

  return (
    <div
      ref={contenedor}
      role="tablist"
      aria-label={etiqueta}
      className={cn('relative inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-700', className)}
    >
      <span
        ref={pastilla}
        aria-hidden="true"
        className={cn(
          'absolute bottom-1 left-0 top-1 rounded-lg bg-brand-600 shadow-sm dark:bg-brand-300',
          animar && 'segmentado-pastilla',
        )}
      />
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="tab"
            id={opcion.id}
            aria-selected={activa}
            aria-controls={opcion.controla}
            onClick={() => onCambiar(opcion.valor)}
            className={cn(
              'relative z-[1] min-h-[36px] rounded-lg px-3.5 text-sm font-semibold transition-colors duration-200',
              activa
                ? 'text-white dark:text-slate-950'
                : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300',
            )}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
