import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw, XCircle, XOctagon } from 'lucide-react';
import { anularPago, listarPagos, reembolsarPago, simularPago } from '../../api/payments';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { formatearFechaHora, formatearMoneda, ETIQUETAS_PAGO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { mensajeDeError } from '../../lib/errors';

const SANDBOX = import.meta.env.VITE_SANDBOX_PAGOS === 'true';

export function PagosAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const pagos = useQuery({ queryKey: ['pagos', 'admin', 'list'], queryFn: () => listarPagos({ page_size: 100, ordering: '-fecha_creacion' }) });

  const invalidar = () => void queryClient.invalidateQueries({ queryKey: ['pagos'] });

  const reembolsar = useMutation({
    mutationFn: (id: number) => reembolsarPago(id),
    onSuccess: () => { invalidar(); toast.exito('Pago reembolsado.'); },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const anular = useMutation({
    mutationFn: (id: number) => anularPago(id),
    onSuccess: () => { invalidar(); toast.exito('Pago anulado.'); },
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
      <EncabezadoPagina titulo="Pagos" descripcion="Seguimiento y gestión administrativa de pagos." />
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
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2 text-rose-600"
                          onClick={() => simular.mutate({ id: pago.id, accion: 'rechazar' })}
                          disabled={simular.isPending}
                          title="Rechazar en sandbox"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {['aprobado', 'procesando'].includes(pago.estado) && (
                      <button type="button" className="btn-ghost p-2" onClick={() => reembolsar.mutate(pago.id)} title="Reembolsar"><RefreshCw className="h-4 w-4" /></button>
                    )}
                    {!['aprobado', 'reembolsado'].includes(pago.estado) && (
                      <button type="button" className="btn-ghost p-2 text-rose-600" onClick={() => anular.mutate(pago.id)} title="Anular"><XOctagon className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
