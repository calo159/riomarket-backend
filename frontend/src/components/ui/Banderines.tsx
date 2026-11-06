import { cn } from '../../lib/utils';
import { useCerca } from '../../lib/useCerca';

const ANCHO = 1440;
const ALTO = 64;
const TRAMOS = 6;
const FASES = 5;
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
 *
 * La cuerda es un SVG quieto, pero cada banderín es un elemento HTML: el navegador anima en la tarjeta gráfica las
 * transformaciones de los elementos HTML, y las de los elementos dentro de un SVG las recalcula en el hilo principal en
 * cada cuadro (con veinte banderines eso era casi toda la CPU de la portada en reposo). Todo cabe en una caja con la
 * proporción del dibujo (1440 × 64) que se agranda hasta cubrir el ancho, como hacía `preserveAspectRatio="slice"`; los
 * tamaños y posiciones van en porcentajes de esa caja. `alto` y `ancho` son las medidas del contenedor en px que
 * decide quien lo usa (para calcular el ancho mínimo de la caja).
 */
export function Banderines({ className, alto = 60 }: { className?: string; alto?: number }) {
  const anchoMinimo = Math.round((alto * ANCHO) / ALTO);
  // Con la portada ya fuera de pantalla los banderines se quedan quietos (`.banderines[data-pausa]`, index.css).
  const [ref, aLaVista] = useCerca<HTMLDivElement>(0);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-pausa={aLaVista ? undefined : '1'}
      className={cn('banderines pointer-events-none overflow-hidden', className)}
      style={{ contain: 'layout paint' }}
    >
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{ width: `max(100%, ${anchoMinimo}px)`, aspectRatio: `${ANCHO} / ${ALTO}` }}
      >
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full">
          <path d={cuerda} fill="none" stroke="#FFF4DC" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {banderines.map((banderin, k) => (
          <span
            key={k}
            className="banderin absolute block"
            style={{
              left: `${((banderin.x - banderin.ancho / 2) / ANCHO) * 100}%`,
              top: `${(banderin.y / ALTO) * 100}%`,
              width: `${(banderin.ancho / ANCHO) * 100}%`,
              height: `${(banderin.largo / ALTO) * 100}%`,
              // Cinco fases de balanceo, no veinte: el costo en CPU depende de cuántas fases distintas hay (ver index.css).
              ['--f' as string]: k % FASES,
            }}
          >
            <span
              className="block h-full w-full"
              style={{
                background: banderin.color,
                opacity: 0.94,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                transform: `rotate(${banderin.giro.toFixed(1)}deg)`,
                transformOrigin: '50% 0',
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
