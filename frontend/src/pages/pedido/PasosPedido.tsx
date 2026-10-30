import { ETIQUETAS_PEDIDO } from '../../lib/format';
import { cn } from '../../lib/utils';

const PASOS = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];

/**
 * Avance del pedido como cinco ranuras que se llenan, igual que las de la canasta.
 * Un pedido cancelado no avanza: se muestra con ranuras vacías y un bloque rojo.
 */
export function PasosPedido({ estado }: { estado: string }) {
  const cancelado = estado === 'cancelado';
  const pasoActual = PASOS.indexOf(estado);
  return (
    <div className="mt-6">
      {cancelado && (
        <p className="mb-3 rounded-lg bg-rojo-600 px-4 py-2 font-extrabold text-white">Pedido cancelado</p>
      )}
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Estado del pedido">
        {PASOS.map((paso, indice) => {
          const alcanzado = !cancelado && indice <= pasoActual;
          const actual = !cancelado && indice === pasoActual;
          return (
            <li key={paso} aria-current={actual ? 'step' : undefined}>
              <span
                aria-hidden="true"
                className={cn(
                  'block h-4 rounded-full border-2',
                  alcanzado && 'border-brand-600 bg-brand-600 dark:border-brand-400 dark:bg-brand-400',
                  !alcanzado && !cancelado && 'border-slate-400 dark:border-slate-500',
                  cancelado && 'border-dashed border-rojo-600 dark:border-rojo-400',
                )}
              />
              <span
                className={cn(
                  'mt-1.5 block text-xs leading-tight sm:text-sm',
                  actual ? 'font-extrabold text-slate-950 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400',
                  cancelado && 'text-slate-500 line-through dark:text-slate-500',
                )}
              >
                {ETIQUETAS_PEDIDO[paso]}
                <span className="sr-only">{alcanzado ? ' (listo)' : ' (pendiente)'}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
