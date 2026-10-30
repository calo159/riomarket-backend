import { CheckCircle2, Clock, Package } from 'lucide-react';
import type { Pedido } from '../../lib/types';
import { formatearFechaHora } from '../../lib/format';

interface Props {
  datos: Pedido;
  esNuevo: boolean;
  esComprador: boolean;
  /** Hay un pago en efectivo sin cobrar (en un retiro se paga en el puesto). */
  efectivoPendiente?: boolean;
}

/** Avisos de contexto sobre el pedido: recién creado, listo para recoger, en camino o con reporte de «no recibido». */
export function AvisosPedido({ datos, esNuevo, esComprador, efectivoPendiente = false }: Props) {
  const esRetiro = datos.tipo_entrega === 'retiro';
  const pagaAlRecoger = esRetiro && efectivoPendiente;
  return (
    <>
      {esNuevo && datos.estado === 'pendiente' && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {pagaAlRecoger
              ? 'Tu pedido fue creado. Pasa por el puesto cuando esté listo. Pagas ahí.'
              : 'Tu pedido fue creado. Registra el pago para que el vendedor pueda confirmarlo.'}
          </p>
        </div>
      )}

      {esRetiro && esComprador && pagaAlRecoger && ['confirmado', 'en_preparacion'].includes(datos.estado) && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
          <Package className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Pasa por el puesto cuando esté listo. Pagas ahí.</p>
        </div>
      )}

      {esRetiro && datos.estado === 'listo_para_recoger' && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
          <Package className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {esComprador
              ? pagaAlRecoger
                ? 'Tu pedido está listo. Pasa por el puesto a recogerlo y págalo ahí en efectivo.'
                : 'Tu pedido está listo. Pasa por el puesto a recogerlo.'
              : pagaAlRecoger
                ? 'Esperando al cliente en el puesto. Entrega el pedido y cobra en efectivo.'
                : 'Esperando al cliente en el puesto. Entrega el pedido cuando llegue.'}
          </p>
        </div>
      )}

      {!esRetiro && datos.estado === 'en_camino' && (
        <div className="mb-5 space-y-2">
          {datos.no_recibido_en && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
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
            <div className="flex items-start gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
              <Package className="mt-0.5 h-4 w-4 shrink-0" />
              <p>El vendedor ya entregó tu pedido al domiciliario. Confírmalo cuando lo tengas.</p>
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
