import { cn } from '../../lib/utils';
import { tonoDe } from '../tonoCategoria';

const FRANJAS = 12;
const ANCHO = 20;
const ALTO = 18;

/**
 * Toldo de un puesto, a escala de tarjeta: franjas del color de la primera categoría del puesto (el tono apagado de
 * `tonoCategoria`) y crema, con el borde festoneado. Es el mismo motivo del toldo del primer pliegue: cada puesto
 * de la lista es, literalmente, un puesto con su toldo. Decorativo (`aria-hidden`).
 */
export function ToldoPuesto({ categoria, className }: { categoria?: string | null; className?: string }) {
  const color = tonoDe(categoria).punto;
  return (
    <svg
      viewBox={`0 0 ${FRANJAS * ANCHO} ${ALTO}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('toldo-puesto block h-[18px] w-full md:h-[22px]', className)}
    >
      {Array.from({ length: FRANJAS }).map((_, i) => {
        const x = i * ANCHO;
        const r = ANCHO / 2;
        // Franja con una media luna abajo: el festón del borde.
        const d = `M${x} 0h${ANCHO}v${ALTO - r}a${r} ${r} 0 0 1 -${ANCHO} 0z`;
        return <path key={i} d={d} fill={i % 2 === 0 ? color : '#FFF4DC'} />;
      })}
      <rect x="0" y="0" width={FRANJAS * ANCHO} height="3" fill="#000" opacity="0.1" />
    </svg>
  );
}
