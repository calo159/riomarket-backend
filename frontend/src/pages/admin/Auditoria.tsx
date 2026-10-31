import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck } from 'lucide-react';
import { listarAuditoria } from '../../api/audit';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { formatearFechaHora } from '../../lib/format';
import { claves } from '../../lib/queryKeys';

export function Auditoria() {
  const logs = useQuery({ queryKey: claves.auditoria, queryFn: () => listarAuditoria({ page_size: 100 }) });
  return (
    <div>
      <EncabezadoPagina titulo="Auditoría" descripcion="Registro de acciones críticas." />
      {logs.isLoading && <CargandoBloque mensaje="Cargando registros…" />}
      {logs.isError && <EstadoError mensaje="No pudimos cargar auditoría." onReintentar={() => void logs.refetch()} />}
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="p-3">Fecha</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Entidad</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody className="entra-lista">
            {(logs.data?.results ?? []).map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="p-3 text-xs text-slate-500">{formatearFechaHora(log.fecha_creacion)}</td>
                <td className="p-3">{log.usuario_correo || (log.id_usuario ? '—' : 'Sistema')}</td>
                <td className="p-3 font-medium">{log.accion}</td>
                <td className="p-3">{log.entidad}{log.id_entidad ? ` #${log.id_entidad}` : ''}</td>
                <td className="p-3">{log.direccion_ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(logs.data?.results.length ?? 0) === 0 && !logs.isLoading && (
          <div className="flex flex-col items-center py-10 text-center text-slate-500">
            <BookOpenCheck className="h-9 w-9" />
            <p className="mt-2">Sin registros</p>
          </div>
        )}
      </div>
    </div>
  );
}
