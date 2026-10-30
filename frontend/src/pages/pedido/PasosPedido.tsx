import { CheckCircle2, ChefHat, Clock, PackageCheck, Truck, XCircle, type LucideIcon } from 'lucide-react';
import { ETIQUETAS_PEDIDO } from '../../lib/format';
import { cn } from '../../lib/utils';

const PASOS: { clave: string; icono: LucideIcon }[] = [
  { clave: 'pendiente', icono: Clock },
  { clave: 'confirmado', icono: CheckCircle2 },
  { clave: 'en_preparacion', icono: ChefHat },
  { clave: 'en_camino', icono: Truck },
  { clave: 'entregado', icono: PackageCheck },
];

/** Seguimiento visual del pedido: pasos con iconos y barra de progreso animada. */
export function PasosPedido({ estado }: { estado: string }) {
  if (estado === 'cancelado') {
    return (
      <div
        className="mt-6 flex items-center gap-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        role="img"
        aria-label="Seguimiento: el pedido fue cancelado"
      >
        <XCircle className="h-8 w-8 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">Este pedido se canceló</p>
          <p className="text-sm">No continuará el seguimiento.</p>
        </div>
      </div>
    );
  }
  const actual = Math.max(0, PASOS.findIndex((p) => p.clave === estado));
  const avance = (actual / (PASOS.length - 1)) * 100;
  return (
    <ol className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-2" aria-label="Estado del pedido">
      {/* Barra de progreso (escritorio): se llena al abrir la página. */}
      <div
        className="pointer-events-none absolute left-[10%] right-[10%] top-[22px] hidden h-1 rounded bg-slate-200 sm:block dark:bg-slate-700"
        aria-hidden="true"
      >
        <div
          className="h-full origin-left animate-grow rounded bg-brand-600 dark:bg-brand-300"
          style={{ width: `${avance}%` }}
        />
      </div>
      {PASOS.map(({ clave, icono: Icono }, indice) => {
        const alcanzado = indice <= actual;
        const esActual = indice === actual;
        return (
          <li
            key={clave}
            aria-current={esActual ? 'step' : undefined}
            className="relative flex items-center gap-3 sm:flex-col sm:gap-1.5 sm:text-center"
          >
            <span
              className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 bg-white transition-colors dark:bg-slate-900',
                alcanzado
                  ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-slate-950'
                  : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400',
                esActual && 'animate-pulsepaso',
              )}
            >
              <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <span
              className={cn(
                'text-sm',
                alcanzado ? 'font-bold text-brand-700 dark:text-brand-200' : 'font-medium text-slate-500 dark:text-slate-400',
              )}
            >
              {ETIQUETAS_PEDIDO[clave]}
              {esActual && <span className="sr-only"> (paso actual)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
