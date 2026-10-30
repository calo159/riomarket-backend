import { ETIQUETAS_PEDIDO } from '../../lib/format';
import { cn } from '../../lib/utils';

const PASOS = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];

/** Línea de progreso del pedido (no se muestra si fue cancelado). */
export function PasosPedido({ estado }: { estado: string }) {
  if (estado === 'cancelado') return null;
  const pasoActual = PASOS.indexOf(estado);
  return (
    <ol className="mt-6 grid gap-2 sm:grid-cols-5" aria-label="Estado del pedido">
      {PASOS.map((paso, indice) => {
        const alcanzado = indice <= pasoActual;
        return (
          <li key={paso} className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:text-center">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                alcanzado
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 text-slate-400 dark:border-slate-700',
              )}
            >
              {indice + 1}
            </span>
            <span className={cn('text-xs font-medium', alcanzado ? 'text-brand-800 dark:text-brand-300' : 'text-slate-400')}>
              {ETIQUETAS_PEDIDO[paso]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
