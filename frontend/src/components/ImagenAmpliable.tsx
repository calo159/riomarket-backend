import { ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../lib/utils';

const ESCALA = 2;

/**
 * Foto que se amplía con un clic o un toque y se aleja con otro (o con Escape).
 * Al estar ampliada, sigue al cursor o al dedo para ver los bordes. Con mouse también se aleja al salir
 * del marco: el zoom no puede quedar atascado, como pasaba cuando dependía solo de `:hover`.
 */
export function ImagenAmpliable({ children, nombre, className }: { children: ReactNode; nombre: string; className?: string }) {
  const marco = useRef<HTMLDivElement>(null);
  const [ampliada, setAmpliada] = useState(false);
  const [origen, setOrigen] = useState('50% 50%');

  const apuntar = (clientX: number, clientY: number) => {
    const caja = marco.current?.getBoundingClientRect();
    if (!caja || caja.width === 0 || caja.height === 0) return;
    const x = Math.min(100, Math.max(0, ((clientX - caja.left) / caja.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - caja.top) / caja.height) * 100));
    setOrigen(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  };

  const alternar = (clientX?: number, clientY?: number) => {
    if (!ampliada && clientX !== undefined && clientY !== undefined) apuntar(clientX, clientY);
    setAmpliada((valor) => !valor);
  };

  const alMover = (evento: PointerEvent<HTMLDivElement>) => {
    if (ampliada) apuntar(evento.clientX, evento.clientY);
  };

  const alSalir = (evento: PointerEvent<HTMLDivElement>) => {
    if (evento.pointerType !== 'touch') setAmpliada(false);
  };

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === 'Escape') {
      setAmpliada(false);
    } else if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      alternar();
    }
  };

  return (
    <div
      ref={marco}
      role="button"
      tabIndex={0}
      aria-pressed={ampliada}
      aria-label={ampliada ? `Alejar la foto de ${nombre}` : `Ampliar la foto de ${nombre}`}
      onClick={(evento) => alternar(evento.clientX, evento.clientY)}
      onPointerMove={alMover}
      onPointerLeave={alSalir}
      onKeyDown={alTeclear}
      className={cn(
        'relative select-none overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        ampliada ? 'cursor-zoom-out touch-none' : 'cursor-zoom-in',
        className,
      )}
    >
      <div
        className="h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: ampliada ? `scale(${ESCALA})` : 'none', transformOrigin: origen }}
      >
        {children}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-brand-600 shadow-sm dark:bg-slate-900/90 dark:text-brand-200"
      >
        {ampliada ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
      </span>
    </div>
  );
}
