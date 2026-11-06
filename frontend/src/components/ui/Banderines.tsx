import { cn } from '../../lib/utils';

const ANCHO = 1440;
const ALTO = 64;
const TRAMOS = 6;
const POR_TRAMO = 5;
const CAIDA = 15;
// Coral y crema del toldo y el turquesa claro de la marca: el amarillo queda para el titular.
const COLORES = ['#E4502A', '#FFF4DC', '#7DB6BC', '#FFF4DC'];

/** Punto de una cuerda que cuelga entre dos postes: una parábola con su flecha en el centro. */
function puntoDeCuerda(tramo: number, t: number) {
  const ancho = ANCHO / TRAMOS;
  const x = tramo * ancho + t * ancho;
  const y = 6 + 4 * CAIDA * t * (1 - t);
  return { x, y };
}

/**
 * Banderines de fiesta tendidos sobre el primer pliegue, como los de una calle de mercado en día de feria. Se bajan al
 * abrir la página y después cada uno se mece un poco, uno tras otro (`.banderin`, index.css). Decorativo (`aria-hidden`).
 */
export function Banderines({ className }: { className?: string }) {
  const tramos = Array.from({ length: TRAMOS });
  const cuerda = tramos
    .map((_, i) => {
      const a = puntoDeCuerda(i, 0);
      const b = puntoDeCuerda(i, 1);
      const medio = puntoDeCuerda(i, 0.5);
      return `${i === 0 ? `M${a.x} ${a.y}` : ''}Q${medio.x} ${medio.y + CAIDA} ${b.x} ${b.y}`;
    })
    .join('');
  let n = 0;
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
      className={cn('banderines pointer-events-none', className)}
    >
      <path d={cuerda} fill="none" stroke="#FFF4DC" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      {tramos.flatMap((_, i) =>
        Array.from({ length: POR_TRAMO }).map((__, j) => {
          const { x, y } = puntoDeCuerda(i, (j + 0.5) / POR_TRAMO);
          const k = n++;
          return (
            <g key={`${i}-${j}`} className="banderin" style={{ transformOrigin: `${x}px ${y}px`, ['--i' as string]: k }}>
              <path d={`M${x - 10} ${y}L${x + 10} ${y}L${x} ${y + 27}Z`} fill={COLORES[k % COLORES.length]} opacity="0.95" />
            </g>
          );
        }),
      )}
    </svg>
  );
}
