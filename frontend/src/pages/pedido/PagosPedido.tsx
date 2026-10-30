import { CreditCard } from 'lucide-react';
import type { Pago } from '../../lib/types';
import { ETIQUETAS_PAGO, formatearFechaHora, formatearMoneda } from '../../lib/format';

interface Props {
  cargando: boolean;
  pagos: Pago[];
  /** Pago sobre el que actúa el vendedor al confirmar efectivo (el más reciente). */
  pagoVigente?: Pago;
  sandbox: boolean;
  puedeSimular: boolean;
  puedeConfirmarEfectivo: boolean;
  puedePagar: boolean;
  simulando: boolean;
  confirmando: boolean;
  onSimular: (idPago: number, aprobar: boolean) => void;
  onConfirmarEfectivo: (idPago: number) => void;
  onPagar: () => void;
}

export function PagosPedido({
  cargando,
  pagos,
  pagoVigente,
  sandbox,
  puedeSimular,
  puedeConfirmarEfectivo,
  puedePagar,
  simulando,
  confirmando,
  onSimular,
  onConfirmarEfectivo,
  onPagar,
}: Props) {
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5" /> Pagos</h2>
      {cargando && <p className="mt-2 text-sm text-slate-500">Cargando pagos…</p>}
      {!cargando && pagos.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
          Este pedido todavía no tiene un pago registrado.
        </p>
      )}
      <div className="mt-3 space-y-3">
        {pagos.map((pago) => (
          <div key={pago.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Pago #{pago.id} · {pago.metodo_pago}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatearFechaHora(pago.fecha_creacion)}
                  {pago.referencia_gateway && ` · Ref. ${pago.referencia_gateway}`}
                </p>
              </div>
              <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {ETIQUETAS_PAGO[pago.estado] ?? pago.estado}
              </span>
            </div>
            <p className="mt-2 text-sm">
              Total cobrado: <strong>{formatearMoneda(pago.total_cobrado)}</strong>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sandbox && puedeSimular && ['pendiente', 'procesando'].includes(pago.estado) && (
                <>
                  <button
                    type="button"
                    className="btn-primary py-1.5 text-xs"
                    onClick={() => onSimular(pago.id, true)}
                    disabled={simulando}
                  >
                    Aprobar (sandbox)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => onSimular(pago.id, false)}
                    disabled={simulando}
                  >
                    Rechazar
                  </button>
                </>
              )}
              {puedeConfirmarEfectivo && pago.id === pagoVigente?.id && (
                <button
                  type="button"
                  className="btn-primary py-1.5 text-xs"
                  onClick={() => onConfirmarEfectivo(pago.id)}
                  disabled={confirmando}
                >
                  Confirmar cobro en efectivo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {puedePagar && (
        <button type="button" className="btn-primary mt-4" onClick={onPagar}>
          Registrar pago
        </button>
      )}
    </section>
  );
}
