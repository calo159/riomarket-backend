import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { listarComisiones, registrarLiquidacion, type Comision } from '../../api/payments';
import { formatearFecha, formatearMoneda } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { claves } from '../../lib/queryKeys';
import { Campo } from '../ui/Campos';
import { CargandoBloque, EstadoError } from '../ui/Estado';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const ESTADOS: Record<Comision['estado'], { texto: string; clase: string }> = {
  al_dia: { texto: 'Al día', clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  aviso: { texto: 'En aviso', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  bloqueado: { texto: 'En pausa', clase: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
};

/** «En pausa» = sus puestos no reciben pedidos nuevos hasta que pague (ADR-020). */
function EstadoCuenta({ estado }: { estado: Comision['estado'] }) {
  const { texto, clase } = ESTADOS[estado];
  return <span className={`badge ${clase}`}>{texto}</span>;
}

/**
 * Comisión por cobrar (ADR-019). El efectivo se cobra en el puesto, así que cada vendedor le debe su comisión
 * a RioMarket; el administrador anota aquí cada pago que recibe (Nequi, transferencia o en mano).
 */
export function ComisionesAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [cuenta, setCuenta] = useState<Comision | null>(null);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cuentas = useQuery({ queryKey: claves.pagos.comisiones, queryFn: listarComisiones });

  const abrir = (fila: Comision) => {
    setCuenta(fila);
    // Lo habitual es que pague todo lo que debe: se propone ese monto, sin decimales de centavos.
    setMonto(String(Math.round(Number(fila.comision_pendiente))));
    setNota('');
    setError(null);
  };

  const anotar = useMutation({
    mutationFn: () => registrarLiquidacion({ id_vendedor: cuenta!.id_vendedor, monto, nota: nota.trim() || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claves.pagos.comisiones });
      toast.exito(`Anotamos el pago de ${cuenta?.vendedor}.`);
      setCuenta(null);
    },
    onError: (e) => setError(mensajeDeError(e, 'No pudimos anotar el pago.')),
  });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!(Number(monto) > 0)) {
      setError('Escribe un monto mayor que cero.');
      return;
    }
    setError(null);
    anotar.mutate();
  };

  const filas = cuentas.data ?? [];
  const porCobrar = filas.reduce((suma, fila) => suma + Math.max(0, Number(fila.comision_pendiente)), 0);

  return (
    <section className="card mb-5 p-4 sm:p-5" aria-labelledby="comisiones-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="comisiones-titulo" className="flex items-center gap-2 text-lg font-bold">
            <HandCoins className="h-5 w-5" aria-hidden="true" /> Comisión por cobrar
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            El efectivo se cobra en el puesto, así que cada vendedor le debe su comisión a RioMarket. Anota aquí cada pago que recibas.
          </p>
        </div>
        {filas.length > 0 && (
          <p className="text-right">
            <span className="block text-xs text-slate-500 dark:text-slate-400">Por cobrar en total</span>
            <span className="text-2xl font-extrabold tabular-nums text-brand-600 dark:text-brand-300">{formatearMoneda(porCobrar)}</span>
          </p>
        )}
      </div>

      {cuentas.isLoading && <CargandoBloque mensaje="Cargando comisiones…" />}
      {cuentas.isError && <EstadoError mensaje="No pudimos cargar las comisiones." onReintentar={() => void cuentas.refetch()} />}
      {cuentas.isSuccess && filas.length === 0 && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Todavía no hay cobros en efectivo aprobados.</p>
      )}

      {filas.length > 0 && (
        <div className="mt-4 overflow-x-auto" role="region" aria-label="Comisión por vendedor" tabIndex={0}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Vendedor</th>
                <th className="p-3 text-right">Efectivo cobrado</th>
                <th className="p-3 text-right">Comisión generada</th>
                <th className="p-3 text-right">Ya pagó</th>
                <th className="p-3 text-right">Debe</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Último pago</th>
                <th className="p-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const debe = Number(fila.comision_pendiente);
                return (
                  <tr key={fila.id_vendedor} className="border-b last:border-0">
                    <td className="p-3 font-medium">{fila.vendedor}</td>
                    <td className="p-3 text-right tabular-nums">{formatearMoneda(fila.cobrado_en_efectivo)}</td>
                    <td className="p-3 text-right tabular-nums">{formatearMoneda(fila.comision_generada)}</td>
                    <td className="p-3 text-right tabular-nums">{formatearMoneda(fila.comision_pagada)}</td>
                    <td className="p-3 text-right font-bold tabular-nums">
                      {debe < 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-300">{formatearMoneda(-debe)} a favor</span>
                      ) : (
                        formatearMoneda(debe)
                      )}
                    </td>
                    <td className="p-3">
                      <EstadoCuenta estado={fila.estado} />
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{fila.ultimo_pago ? formatearFecha(fila.ultimo_pago) : '—'}</td>
                    <td className="p-3 text-right">
                      <button type="button" className="btn-secondary" disabled={debe <= 0} onClick={() => abrir(fila)}>
                        Anotar pago
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={cuenta !== null} onCerrar={() => setCuenta(null)} titulo={`Anotar pago de ${cuenta?.vendedor ?? ''}`}>
        {cuenta && (
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Debe <strong>{formatearMoneda(cuenta.comision_pendiente)}</strong>. Anota lo que recibiste; no puede ser más que eso.
            </p>
            <Campo etiqueta="Monto recibido" htmlFor="monto-comision" error={error ?? undefined}>
              <input
                id="monto-comision"
                inputMode="decimal"
                className="input"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value.replace(',', '.'))}
              />
            </Campo>
            <Campo etiqueta="Nota (opcional)" htmlFor="nota-comision" ayuda="Por ejemplo: «Nequi del lunes».">
              <input id="nota-comision" className="input" maxLength={200} value={nota} onChange={(evento) => setNota(evento.target.value)} />
            </Campo>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setCuenta(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={anotar.isPending}>
                {anotar.isPending ? 'Anotando…' : 'Anotar pago'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
