import { CheckCircle2 } from 'lucide-react';
import type { Pedido } from '../../lib/types';
import { formatearMoneda } from '../../lib/format';

/**
 * El momento de cierre de la compra: el pedido recién enviado se «imprime» como un ticket y se sella. Reemplaza al
 * aviso verde genérico de antes. El mensaje (qué pasa ahora y cómo se paga) lo decide `AvisosPedido`; esto solo lo viste.
 * Con «reducir movimiento» aparece ya impreso y sellado.
 */
export function TicketEnviado({ datos, mensaje }: { datos: Pedido; mensaje: string }) {
  const unidades = (datos.items ?? []).reduce((suma, item) => suma + item.cantidad, 0);
  return (
    <section
      role="status"
      aria-label={`Pedido ${datos.id} enviado`}
      className="ticket-imprime relative mb-6 overflow-hidden rounded-xl bg-white shadow-menu ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <div className="flex items-start gap-4 p-5">
        <span
          aria-hidden="true"
          className="sello-llega grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-exito text-exito dark:border-[#6FD596] dark:text-[#6FD596]"
        >
          <CheckCircle2 className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Pedido #{datos.id} enviado
          </p>
          <p className="mt-1 text-base font-semibold leading-snug">{mensaje}</p>
        </div>
      </div>

      {/* Línea de corte del ticket, con sus muescas. */}
      <div className="relative" aria-hidden="true">
        <div className="mx-5 border-t-2 border-dashed border-slate-200 dark:border-slate-700" />
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-fondo dark:bg-slate-950" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-fondo dark:bg-slate-950" />
      </div>

      <dl className="grid grid-cols-3 gap-3 px-5 py-4 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Productos</dt>
          <dd className="font-semibold">{unidades}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Entrega</dt>
          <dd className="font-semibold">{datos.tipo_entrega === 'domicilio' ? 'A domicilio' : 'Retiro en el puesto'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Total</dt>
          <dd className="font-semibold tabular-nums">{formatearMoneda(datos.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
