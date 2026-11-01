import { useId, type CSSProperties } from 'react';
import { cn } from '../../lib/utils';

/**
 * Detalles de marca compartidos: las olas del logo como textura. Son decorativos (`aria-hidden`), toman el
 * color del texto que los rodea (`currentColor`, se atenúan con `opacity-*`) y van en SVG en línea, así que
 * no piden ninguna imagen externa.
 */

/** Degradado que desvanece una capa hacia un lado; sirve de máscara para que el patrón no tape el texto. */
export function desvanecer(direccion: string, hasta = 70): CSSProperties {
  const gradiente = `linear-gradient(${direccion}, #000 0%, transparent ${hasta}%)`;
  return { WebkitMaskImage: gradiente, maskImage: gradiente };
}

/** Igual, pero en mancha: se desvanece en todas las direcciones desde un punto (sin bordes duros). */
export function desvanecerEnMancha(centro = '100% 50%', ancho = 55, alto = 120): CSSProperties {
  const gradiente = `radial-gradient(${ancho}% ${alto}% at ${centro}, #000 0%, transparent 100%)`;
  return { WebkitMaskImage: gradiente, maskImage: gradiente };
}

/** Filas de olas que se repiten por todo el contenedor (posición absoluta; el padre debe ser `relative`). */
export function PatronOlas({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={style}
    >
      <defs>
        <pattern id={id} width="56" height="36" patternUnits="userSpaceOnUse">
          <path d="M0 9q14 -11 28 0t28 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-28 27q14 -11 28 0t28 0t28 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Dos siluetas de olas pegadas al borde inferior que se desplazan despacio (se detienen con «menos movimiento»). */
export function OlasInferiores({ className }: { className?: string }) {
  const tramo = 'M0 12q15 -12 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0V24H0Z';
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden', className)}>
      <svg viewBox="0 0 240 24" preserveAspectRatio="none" className="absolute bottom-0 h-full w-[200%] animate-deriva fill-current opacity-60">
        <path d={tramo} />
      </svg>
      <svg
        viewBox="0 0 240 24"
        preserveAspectRatio="none"
        className="absolute bottom-0 h-[70%] w-[200%] animate-deriva-inversa fill-current"
      >
        <path d={tramo} />
      </svg>
    </div>
  );
}

/** Borde festoneado (las medias lunas del toldo del logo) que se apoya sobre el borde superior del padre. */
export function BordeFestoneado({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('borde-festoneado pointer-events-none absolute inset-x-0 bottom-full', className)} />;
}
