import { cn } from '../../lib/utils';

const ANCHO = 1440;
const ALTO = 64;
const TRAMOS = 6;
const CAIDA = 15;
// Coral y crema del toldo y el turquesa claro de la marca: el amarillo queda para el titular.
const COLORES = ['#E4502A', '#FFF4DC', '#FFF4DC', '#7DB6BC', '#E4502A'];

/** Punto de la cuerda en `x`: seis tramos que cuelgan entre postes, cada uno con su flecha en el centro. */
function cuerdaEn(x: number) {
  const ancho = ANCHO / TRAMOS;
  const tramo = Math.min(TRAMOS - 1, Math.floor(x / ancho));
  const t = (x - tramo * ancho) / ancho;
  return 6 + 4 * CAIDA * t * (1 - t);
}

/** Azar repetible (siempre los mismos banderines): nadie ata 30 banderines idénticos a la misma distancia. */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const banderines = (() => {
  const r = azar(7);
  const lista: { x: number; y: number; ancho: number; largo: number; giro: number; color: string }[] = [];
  let x = 26;
  while (x < ANCHO - 20) {
    const y = cuerdaEn(x);
    lista.push({
      x,
      y,
      ancho: 15 + r() * 8,
      largo: 21 + r() * 14,
      giro: (r() - 0.5) * 9,
      color: COLORES[Math.floor(r() * COLORES.length)],
    });
    // A veces dos juntos, a veces un hueco.
    x += r() < 0.22 ? 24 + r() * 8 : 44 + r() * 38;
  }
  return lista;
})();

const cuerda = (() => {
  const ancho = ANCHO / TRAMOS;
  let d = `M0 6`;
  for (let i = 0; i < TRAMOS; i++) d += `Q${i * ancho + ancho / 2} ${6 + 2 * CAIDA} ${(i + 1) * ancho} 6`;
  return d;
})();

/**
 * Banderines de fiesta tendidos sobre el primer pliegue, como los de una calle de mercado en día de feria: distintos de
 * tamaño, algo torcidos y a distancias desiguales. Se bajan al abrir la página y después cada uno se mece un poco
 * (`.banderin`, index.css). Decorativo (`aria-hidden`).
 */
export function Banderines({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
      className={cn('banderines pointer-events-none', className)}
    >
      <path d={cuerda} fill="none" stroke="#FFF4DC" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      {banderines.map((b, k) => (
        <g key={k} className="banderin" style={{ transformOrigin: `${b.x}px ${b.y}px`, ['--i' as string]: k }}>
          <path
            transform={`rotate(${b.giro.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)})`}
            d={`M${(b.x - b.ancho / 2).toFixed(1)} ${b.y.toFixed(1)}L${(b.x + b.ancho / 2).toFixed(1)} ${b.y.toFixed(1)}L${b.x.toFixed(1)} ${(b.y + b.largo).toFixed(1)}Z`}
            fill={b.color}
            opacity="0.94"
          />
        </g>
      ))}
    </svg>
  );
}
