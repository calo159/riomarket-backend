import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Estrellas({
  valor,
  maximo = 5,
  tamano = 'h-4 w-4',
  interactivo = false,
  onCambiar,
  etiqueta = 'Calificación',
}: {
  valor: number;
  maximo?: number;
  tamano?: string;
  interactivo?: boolean;
  onCambiar?: (valor: number) => void;
  etiqueta?: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5" role={interactivo ? 'radiogroup' : 'img'} aria-label={etiqueta}>
      {Array.from({ length: maximo }).map((_, indice) => {
        const numero = indice + 1;
        const llena = numero <= Math.round(valor);
        if (!interactivo) {
          // Un 4,5 se ve como 4 estrellas y media (antes se redondeaba y se dibujaban 5 llenas).
          const resto = valor - indice;
          if (resto >= 0.25 && resto < 0.75) {
            return (
              <span key={numero} className="relative inline-flex" aria-hidden="true">
                <Star className={cn(tamano, 'text-slate-300 dark:text-slate-600')} />
                <span className="absolute inset-0 overflow-hidden [clip-path:inset(0_50%_0_0)]">
                  <Star className={cn(tamano, 'fill-estrella text-estrella dark:fill-amber-400 dark:text-amber-400')} />
                </span>
              </span>
            );
          }
          return (
            <Star
              key={numero}
              className={cn(tamano, resto >= 0.75 ? 'fill-estrella text-estrella dark:fill-amber-400 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600')}
              aria-hidden="true"
            />
          );
        }
        return (
          <button
            key={numero}
            type="button"
            role="radio"
            aria-checked={valor === numero}
            aria-label={`${numero} ${numero === 1 ? 'estrella' : 'estrellas'}`}
            onClick={() => onCambiar?.(numero)}
            className="rounded p-0.5"
          >
            <Star
              className={cn(tamano, llena ? 'fill-estrella text-estrella dark:fill-amber-400 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600')}
            />
          </button>
        );
      })}
    </div>
  );
}
