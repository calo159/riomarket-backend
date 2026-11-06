import { cn } from '../../lib/utils';

/**
 * Título de sección de la tienda: un solo color y peso firme (la escala está en `.titulo-seccion`, index.css), con una
 * ola del logo dibujada debajo. La ola se traza sola cuando la sección aparece (`.ola-titulo`, index.css) y es lo único
 * que repite el motivo de la marca en cada sección sin recargarla.
 */
export function TituloSeccion({ texto, className }: { texto: string; className?: string }) {
  return (
    <h2 className={cn('titulo-seccion', className)}>
      {texto}
      <svg viewBox="0 0 56 8" aria-hidden="true" focusable="false" className="ola-titulo mt-1.5 block h-2 w-14 text-brand-500 dark:text-brand-300">
        <path d="M2 5q6.5-6 13 0t13 0t13 0t13 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" pathLength="100" />
      </svg>
    </h2>
  );
}
