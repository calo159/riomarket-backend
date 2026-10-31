import { Link } from 'react-router-dom';
import { etiquetaEstado } from '../../lib/format';
import { EtiquetaEstado } from '../ui/EtiquetaEstado';

/** Chips con el número de pedidos por estado; cada uno lleva a la lista ya filtrada. */
export function ConteoEstados({ conteo, base }: { conteo: Record<string, number>; base: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {Object.entries(conteo).map(([estado, cantidad]) => (
        <li key={estado}>
          <Link
            to={`${base}?estado=${estado}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 hover:border-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-300 md:min-h-[36px]"
            aria-label={`${etiquetaEstado(estado)}: ${cantidad} ${cantidad === 1 ? 'pedido' : 'pedidos'}`}
          >
            <EtiquetaEstado estado={estado} />
            <span className="text-base font-extrabold tabular-nums">{cantidad}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
