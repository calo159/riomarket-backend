import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { decidirSolicitud, listarSolicitudes } from '../../api/verification';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { Modal } from '../../components/ui/Modal';
import { Campo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';

export function Verificaciones() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filtro, setFiltro] = useState('pendiente');
  const [rechazar, setRechazar] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');

  const solicitudes = useQuery({ queryKey: ['solicitudes', filtro], queryFn: () => listarSolicitudes(filtro || undefined) });

  const decidir = useMutation({
    mutationFn: ({ id, estado, motivo_rechazo }: { id: number; estado: 'aprobado' | 'rechazado'; motivo_rechazo?: string }) =>
      decidirSolicitud(id, { estado, motivo_rechazo }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
      void queryClient.invalidateQueries({ queryKey: ['verif'] });
      setRechazar(null);
      setMotivo('');
      toast.exito(variables.estado === 'aprobado' ? 'Verificación aprobada.' : 'Verificación rechazada.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Verificaciones"
        descripcion="Revisa cédulas y aprueba o rechaza vendedores."
        acciones={
          <select className="input w-auto" value={filtro} onChange={(evento) => setFiltro(evento.target.value)}>
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobadas</option>
            <option value="rechazado">Rechazadas</option>
          </select>
        }
      />
      {solicitudes.isLoading && <CargandoBloque mensaje="Cargando solicitudes…" />}
      {solicitudes.isError && <EstadoError mensaje="No pudimos cargar solicitudes." onReintentar={() => void solicitudes.refetch()} />}
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="p-3">Vendedor</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Solicitud</th>
              <th className="p-3">Revisión</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(solicitudes.data?.results ?? []).map((sol) => (
              <tr key={sol.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{sol.nombre_usuario}</td>
                <td className="p-3">{sol.correo_usuario}</td>
                <td className="p-3">{ETIQUETAS_VERIFICACION[sol.estado_verificacion] ?? sol.estado_verificacion}</td>
                <td className="p-3 text-xs text-slate-500">{formatearFechaHora(sol.fecha_solicitud)}</td>
                <td className="p-3 text-xs text-slate-500">{sol.fecha_revision ? formatearFechaHora(sol.fecha_revision) : '—'}</td>
                <td className="p-3 text-right">
                  {sol.estado_verificacion === 'pendiente' && (
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost p-2 text-emerald-600" onClick={() => decidir.mutate({ id: sol.id, estado: 'aprobado' })}><CheckCircle2 className="h-4 w-4" /></button>
                      <button type="button" className="btn-ghost p-2 text-rose-600" onClick={() => setRechazar(sol.id)}><XCircle className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal abierto={Boolean(rechazar)} onCerrar={() => setRechazar(null)} titulo="Rechazar verificación">
        <Campo etiqueta="Motivo del rechazo" htmlFor="motivo">
          <textarea id="motivo" rows={3} className="input" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />
        </Campo>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setRechazar(null)}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!motivo.trim() || decidir.isPending} onClick={() => rechazar && decidir.mutate({ id: rechazar, estado: 'rechazado', motivo_rechazo: motivo.trim() })}>Rechazar</button>
        </div>
      </Modal>
    </div>
  );
}
