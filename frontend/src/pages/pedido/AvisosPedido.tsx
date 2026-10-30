import { CheckCircle2, Clock, Package } from 'lucide-react';
import type { Pedido } from '../../lib/types';
import { formatearFechaHora } from '../../lib/format';

interface Props {
  datos: Pedido;
  esNuevo: boolean;
  esComprador: boolean;
}

/** Avisos de contexto sobre el pedido: recién creado, en camino o con reporte de «no recibido». */
export function AvisosPedido({ datos, esNuevo, esComprador }: Props) {
  return (
    <>
      {esNuevo && datos.estado === 'pendiente' && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-verde-300 bg-verde-50 px-4 py-3 text-sm text-verde-900 dark:border-verde-800 dark:bg-verde-950/50 dark:text-verde-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Tu pedido fue creado. Registra el pago para que el vendedor pueda confirmarlo.</p>
        </div>
      )}

      {datos.estado === 'en_camino' && (
        <div className="mb-5 space-y-2">
          {datos.no_recibido_en && (
            <div className="flex items-start gap-2 rounded-xl border border-sol-300 bg-sol-50 px-4 py-3 text-sm text-sol-900 dark:border-sol-800 dark:bg-sol-950/50 dark:text-sol-200">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {esComprador ? 'Ya avisaste que no te ha llegado' : 'El comprador reportó que no le ha llegado'}
                {' '}el {formatearFechaHora(datos.no_recibido_en)}.
                {datos.motivo_no_recibido && <> Motivo: {datos.motivo_no_recibido}.</>}
                {esComprador && ' Si el pedido llega, confírmalo con "Ya recibí mi pedido".'}
              </p>
            </div>
          )}
          {!datos.no_recibido_en && esComprador && (
            <div className="flex items-start gap-2 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
              <Package className="mt-0.5 h-4 w-4 shrink-0" />
              <p>El vendedor ya entregó tu pedido al domiciliario o está listo para retirar. Confírmalo cuando lo tengas.</p>
            </div>
          )}
          {!datos.no_recibido_en && !esComprador && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Esperando que el comprador confirme que recibió el pedido.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
