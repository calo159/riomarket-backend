import { Clock } from 'lucide-react';
import type { Pedido } from '../../lib/types';
import { ETIQUETAS_PAGO, formatearMoneda } from '../../lib/format';

interface Props {
  datos: Pedido;
  /** Estado del pago más reciente (``undefined`` si no hay ninguno). */
  estadoPagoVigente?: string;
  pagoAprobado: boolean;
}

export function ResumenPedido({ datos, estadoPagoVigente, pagoAprobado }: Props) {
  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-24" aria-label="Resumen del pedido">
      <h2 className="text-lg font-bold">Resumen</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Subtotal</dt><dd>{formatearMoneda(datos.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Domicilio</dt><dd>{formatearMoneda(datos.tarifa_domicilio)}</dd></div>
        {Number(datos.descuento_cupon) > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>Descuento</dt><dd>− {formatearMoneda(datos.descuento_cupon)}</dd></div>
        )}
      </dl>
      <div className="my-3 border-t" />
      <div className="flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <span className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{formatearMoneda(datos.total)}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Estado del pago:{' '}
        <strong className="text-slate-700 dark:text-slate-300">
          {pagoAprobado ? 'aprobado' : estadoPagoVigente ? ETIQUETAS_PAGO[estadoPagoVigente] ?? estadoPagoVigente : 'sin registrar'}
        </strong>
      </p>
      {datos.estado === 'pendiente' && pagoAprobado && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Clock className="mr-1 inline h-3.5 w-3.5" /> El vendedor confirmará tu pedido cuando revise el pago.
        </p>
      )}
    </aside>
  );
}
