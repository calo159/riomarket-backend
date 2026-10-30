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
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-verde-600 px-4 py-3 text-sm font-medium text-white">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Tu pedido fue creado. Registra el pago para que el vendedor pueda confirmarlo.</p>
        </div>
      )}

      {datos.estado === 'en_camino' && (
        <div className="mb-5 space-y-2">
          {datos.no_recibido_en && (
            <div className="flex items-start gap-2 rounded-lg bg-sol-400 px-4 py-3 text-sm font-medium text-slate-950">
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
            <div className="flex items-start gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white dark:bg-brand-500">
              <Package className="mt-0.5 h-4 w-4 shrink-0" />
              <p>El vendedor ya entregó tu pedido al domiciliario o está listo para retirar. Confírmalo cuando lo tengas.</p>
            </div>
          )}
          {!datos.no_recibido_en && !esComprador && (
            <div className="flex items-start gap-2 rounded-lg bg-slate-200 px-4 py-3 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Esperando que el comprador confirme que recibió el pedido.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
