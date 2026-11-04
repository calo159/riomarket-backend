import { useQuery } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { listarComisiones } from '../../api/payments';
import { formatearFecha, formatearMoneda } from '../../lib/format';
import { claves } from '../../lib/queryKeys';

/**
 * Lo que el vendedor le debe a RioMarket por el efectivo que cobró (ADR-019). No se muestra si nunca cobró en
 * efectivo, para no agregar ruido; tampoco si la consulta falla (no es lo principal de la pantalla).
 */
export function ComisionDelVendedor() {
  const cuentas = useQuery({ queryKey: claves.pagos.comisiones, queryFn: listarComisiones });
  const cuenta = cuentas.data?.[0];
  if (!cuenta || (Number(cuenta.comision_generada) === 0 && Number(cuenta.comision_pagada) === 0)) return null;

  const debe = Number(cuenta.comision_pendiente);
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="comision-vendedor">
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
      {debe > 0 && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Entrégala a RioMarket; el administrador anota cada pago y aquí verás cómo baja.
        </p>
      )}
    </section>
  );
}
