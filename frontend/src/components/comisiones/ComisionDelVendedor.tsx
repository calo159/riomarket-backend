import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, HandCoins, PauseCircle } from 'lucide-react';
import { listarComisiones } from '../../api/payments';
import { formatearFecha, formatearMoneda } from '../../lib/format';
import { claves } from '../../lib/queryKeys';

/**
 * Lo que el vendedor le debe a RioMarket por el efectivo que cobró (ADR-019) y en qué punto de la política de
 * atraso está (ADR-020). No se muestra si nunca cobró en efectivo, para no agregar ruido; tampoco si la consulta
 * falla (no es lo principal de la pantalla).
 */
export function ComisionDelVendedor() {
  const cuentas = useQuery({ queryKey: claves.pagos.comisiones, queryFn: listarComisiones });
  const cuenta = cuentas.data?.[0];
  if (!cuenta || (Number(cuenta.comision_generada) === 0 && Number(cuenta.comision_pagada) === 0)) return null;

  const debe = Number(cuenta.comision_pendiente);
  const pausado = cuenta.estado === 'bloqueado';
  const enAviso = cuenta.estado === 'aviso';
  return (
    <section
      className={`card p-4 sm:p-5 ${pausado ? 'border-rose-300 dark:border-rose-800' : enAviso ? 'border-amber-300 dark:border-amber-800' : ''}`}
      aria-labelledby="comision-vendedor"
    >
      <h2 id="comision-vendedor" className="flex items-center gap-2 text-lg font-bold">
        <HandCoins className="h-5 w-5" aria-hidden="true" /> Comisión por pagar a RioMarket
      </h2>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-600 dark:text-brand-300">
        {debe > 0 ? formatearMoneda(debe) : debe < 0 ? `${formatearMoneda(-debe)} a tu favor` : 'Estás al día'}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Del efectivo que cobraste ({formatearMoneda(cuenta.cobrado_en_efectivo)}) le corresponden a RioMarket{' '}
        {formatearMoneda(cuenta.comision_generada)}; ya pagaste {formatearMoneda(cuenta.comision_pagada)}.
        {cuenta.ultimo_pago && ` Tu último pago fue el ${formatearFecha(cuenta.ultimo_pago)}.`}
      </p>

      {pausado && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200" role="alert">
          <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>Tus puestos están en pausa para pedidos nuevos</strong> porque tu deuda llegó al límite de{' '}
            {formatearMoneda(cuenta.limite_bloqueo)}. Paga <strong>{formatearMoneda(cuenta.pagar_para_reactivar)}</strong> a RioMarket
            para volver a recibirlos. Los pedidos que ya tienes en curso siguen igual.
          </p>
        </div>
      )}
      {enAviso && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Tu deuda va creciendo.
            {Number(cuenta.limite_bloqueo) > 0 &&
              ` Si llega a ${formatearMoneda(cuenta.limite_bloqueo)}, tus puestos dejarán de recibir pedidos nuevos hasta que pagues.`}
          </p>
        </div>
      )}
      {debe > 0 && !pausado && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Entrégala a RioMarket; el administrador anota cada pago y aquí verás cómo baja.
        </p>
      )}
    </section>
  );
}
