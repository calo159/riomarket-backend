import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, RefreshCw, XCircle, XOctagon } from 'lucide-react';
import { anularPago, listarPagos, reembolsarPago, simularPago } from '../../api/payments';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { ConfirmarModal } from '../../components/ui/Modal';
import { formatearFechaHora, formatearMoneda, ETIQUETAS_PAGO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import { claves } from '../../lib/queryKeys';

const SANDBOX = import.meta.env.VITE_SANDBOX_PAGOS === 'true';

export function PagosAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const estado = searchParams.get('estado') ?? '';
  const porConfirmar = searchParams.get('por_confirmar') === 'true';
  const [pendiente, setPendiente] = useState<{ id: number; accion: 'reembolsar' | 'anular' } | null>(null);

  useEffect(() => {
    document.title = 'Pagos · Administración · RioMarket';
  }, []);

  const cambiarEstado = (valor: string) => {
    const siguiente = new URLSearchParams(searchParams);
    if (valor) siguiente.set('estado', valor);
    else siguiente.delete('estado');
    if (valor) siguiente.delete('por_confirmar');
    setSearchParams(siguiente, { replace: true });
  };

  const alternarPorConfirmar = (activo: boolean) => {
    const siguiente = new URLSearchParams(searchParams);
    if (activo) {
      siguiente.set('por_confirmar', 'true');
      siguiente.delete('estado');
    } else {
      siguiente.delete('por_confirmar');
    }
    setSearchParams(siguiente, { replace: true });
  };

  const pagos = useQuery({
    queryKey: claves.pagos.admin(estado, porConfirmar),
    queryFn: () =>
      listarPagos({
        page_size: 100,
        ordering: '-fecha_creacion',
        estado: estado || undefined,
        por_confirmar: porConfirmar ? true : undefined,
      }),
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.pagos.todos });
    void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
    void invalidarMenu(queryClient);
  };

  const reembolsar = useMutation({
    mutationFn: (id: number) => reembolsarPago(id),
    onSuccess: () => { invalidar(); setPendiente(null); toast.exito('Pago reembolsado.'); },
    onError: (error) => { setPendiente(null); toast.error(mensajeDeError(error)); },
  });

  const anular = useMutation({
    mutationFn: (id: number) => anularPago(id),
    onSuccess: () => { invalidar(); setPendiente(null); toast.exito('Pago anulado.'); },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const simular = useMutation({
    mutationFn: ({ id, accion }: { id: number; accion: 'aprobar' | 'rechazar' }) => simularPago(id, accion),
    onSuccess: (_, variables) => {
      invalidar();
      toast.exito(variables.accion === 'aprobar' ? 'Pago aprobado en sandbox.' : 'Pago rechazado en sandbox.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Pagos"
        descripcion="Seguimiento y gestión administrativa de pagos."
        acciones={
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input w-auto"
              value={porConfirmar ? '' : estado}
              onChange={(evento) => cambiarEstado(evento.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="procesando">Procesando</option>
              <option value="aprobado">Aprobados</option>
              <option value="rechazado">Rechazados</option>
              <option value="reembolsado">Reembolsados</option>
              <option value="anulado">Anulados</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={porConfirmar}
                onChange={(evento) => alternarPorConfirmar(evento.target.checked)}
              />
              Solo por confirmar
            </label>
          </div>
        }
      />
      {pagos.isLoading && <CargandoBloque mensaje="Cargando pagos…" />}
      {pagos.isError && <EstadoError mensaje="No pudimos cargar pagos." onReintentar={() => void pagos.refetch()} />}
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="p-3">Pago</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Método</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Total</th>
              <th className="p-3">Fecha</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(pagos.data?.results ?? []).map((pago) => (
              <tr key={pago.id} className="border-b last:border-0">
                <td className="p-3">#{pago.id}</td>
                <td className="p-3">#{pago.id_pedido}</td>
                <td className="p-3">{pago.metodo_pago}</td>
                <td className="p-3">{ETIQUETAS_PAGO[pago.estado] ?? pago.estado}</td>
                <td className="p-3 font-semibold">{formatearMoneda(pago.total_cobrado)}</td>
                <td className="p-3 text-xs text-slate-500">{formatearFechaHora(pago.fecha_creacion)}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    {SANDBOX && ['pendiente', 'procesando'].includes(pago.estado) && (
                      <>
                        <button
                          type="button"
                          className="btn-ghost p-2 text-emerald-600"
                          onClick={() => simular.mutate({ id: pago.id, accion: 'aprobar' })}
                          disabled={simular.isPending}
                          title="Aprobar en sandbox"
                          aria-label={`Aprobar el pago #${pago.id} en sandbox`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2 text-rose-600"
                          onClick={() => simular.mutate({ id: pago.id, accion: 'rechazar' })}
                          disabled={simular.isPending}
                          title="Rechazar en sandbox"
                          aria-label={`Rechazar el pago #${pago.id} en sandbox`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {['aprobado', 'procesando'].includes(pago.estado) && (
                      <button type="button" className="btn-ghost p-2" onClick={() => setPendiente({ id: pago.id, accion: 'reembolsar' })} title="Reembolsar" aria-label={`Reembolsar el pago #${pago.id}`}><RefreshCw className="h-4 w-4" /></button>
                    )}
                    {!['aprobado', 'reembolsado'].includes(pago.estado) && (
                      <button type="button" className="btn-ghost p-2 text-rose-600" onClick={() => setPendiente({ id: pago.id, accion: 'anular' })} title="Anular" aria-label={`Anular el pago #${pago.id}`}><XOctagon className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagos.data && pagos.data.results.length === 0 && (
        <EstadoVacio titulo="Sin pagos" descripcion="No hay pagos con esos filtros." />
      )}
      {pagos.data && pagos.data.count > pagos.data.results.length && (
        <p className="mt-2 text-xs text-slate-500">
          Mostrando {pagos.data.results.length} de {pagos.data.count} pagos. Filtra por estado para ver el resto.
        </p>
      )}

      <ConfirmarModal
        abierto={pendiente !== null}
        titulo={pendiente?.accion === 'reembolsar' ? `¿Reembolsar el pago #${pendiente.id}?` : `¿Anular el pago #${pendiente?.id ?? ''}?`}
        descripcion={
          pendiente?.accion === 'reembolsar'
            ? 'Se marcará el pago como reembolsado. Esta acción no se puede deshacer.'
            : 'El pago quedará anulado y no podrá cobrarse. Esta acción no se puede deshacer.'
        }
        textoConfirmar={pendiente?.accion === 'reembolsar' ? 'Reembolsar' : 'Anular'}
        cargando={reembolsar.isPending || anular.isPending}
        onConfirmar={() => {
          if (!pendiente) return;
          if (pendiente.accion === 'reembolsar') reembolsar.mutate(pendiente.id);
          else anular.mutate(pendiente.id);
        }}
        onCerrar={() => setPendiente(null)}
      />
    </div>
  );
}
