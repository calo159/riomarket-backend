import { formatearMoneda } from '../../lib/format';

export interface FilaBarra {
  id: number | string;
  nombre: string;
  unidades: number;
  ventas: string;
  /** Texto secundario (el puesto, para el administrador). */
  detalle?: string | null;
}

/**
 * Lista ordenada de lo más vendido. El texto da el dato; la barra de 8 px solo apoya la lectura
 * (por eso no necesita alternativa propia).
 */
export function BarrasHorizontales({ filas }: { filas: FilaBarra[] }) {
  const maximo = Math.max(1, ...filas.map((fila) => fila.unidades));
  return (
    <ol className="space-y-3">
      {filas.map((fila, indice) => (
        <li key={fila.id}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold">
              <span className="mr-2 tabular-nums text-slate-500 dark:text-slate-400">{indice + 1}.</span>
              {fila.nombre}
            </p>
            <p className="shrink-0 text-sm tabular-nums text-slate-600 dark:text-slate-300">
              <span className="font-bold text-tinta dark:text-slate-100">{fila.unidades} unid.</span> · {formatearMoneda(fila.ventas)}
            </p>
          </div>
          {fila.detalle && <p className="text-xs text-slate-500 dark:text-slate-400">{fila.detalle}</p>}
          <div className="mt-1.5 h-2 rounded-sm bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div className="h-2 rounded-sm bg-brand-600 dark:bg-brand-300" style={{ width: `${(fila.unidades / maximo) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
