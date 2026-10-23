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
    <div className="inline-flex items-center gap-0.5" role={interactivo ? 'radiogroup' : undefined} aria-label={etiqueta}>
      {Array.from({ length: maximo }).map((_, indice) => {
        const numero = indice + 1;
        const llena = numero <= Math.round(valor);
        if (!interactivo) {
          return (
            <Star
              key={numero}
              className={cn(tamano, llena ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600')}
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
              className={cn(tamano, llena ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600')}
            />
          </button>
        );
      })}
    </div>
  );
}
