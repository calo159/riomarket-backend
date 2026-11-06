import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, Search } from 'lucide-react';
import { listarAuditoria } from '../../api/audit';
import { BotonExportar } from '../../components/admin/BotonExportar';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { ETIQUETAS_ACCION, resumenDetalle } from '../../lib/auditoria';
import { formatearFechaHora } from '../../lib/format';
import { claves } from '../../lib/queryKeys';
import { nombreMarca } from '../../lib/sitio';

const TAMANO = 25;

export function Auditoria() {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [accion, setAccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    document.title = `Auditoría · Administración · ${nombreMarca()}`;
  }, []);

  const filtros = {
    q: busqueda.trim() || undefined,
    accion: accion || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  };
  const logs = useQuery({
    queryKey: claves.auditoriaLista(pagina, busqueda.trim(), accion, desde, hasta),
    queryFn: () => listarAuditoria({ ...filtros, page: pagina, page_size: TAMANO }),
    placeholderData: (anterior) => anterior,
  });

  const cambiar = (fijar: (valor: string) => void) => (evento: { target: { value: string } }) => {
    fijar(evento.target.value);
    setPagina(1);
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Quién hizo qué y cuándo: cada decisión crítica queda registrada, con el motivo."
        acciones={<BotonExportar ruta="/audit/registros/exportar/" params={filtros} nombre="auditoria.csv" />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            className="input w-64 pl-9"
            placeholder="Correo, nombre o entidad"
            value={busqueda}
            onChange={cambiar(setBusqueda)}
            aria-label="Buscar en la auditoría"
          />
        </div>
        <select className="input w-auto" value={accion} onChange={cambiar(setAccion)} aria-label="Filtrar por acción">
          <option value="">Todas las acciones</option>
          {Object.entries(ETIQUETAS_ACCION).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
        <label className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
          Desde
          <input type="date" className="input mt-1 w-auto" value={desde} max={hasta || undefined} onChange={cambiar(setDesde)} />
        </label>
        <label className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
          Hasta
          <input type="date" className="input mt-1 w-auto" value={hasta} min={desde || undefined} onChange={cambiar(setHasta)} />
        </label>
      </div>

      {logs.isLoading && <CargandoBloque mensaje="Cargando registros…" />}
      {logs.isError && <EstadoError mensaje="No pudimos cargar auditoría." onReintentar={() => void logs.refetch()} />}
      <div className="overflow-x-auto card" role="region" aria-label="Registros de auditoría" tabIndex={0}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="p-3">Fecha</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Entidad</th>
              <th className="p-3">Qué cambió</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody className="entra-lista">
            {(logs.data?.results ?? []).map((log) => (
              <tr key={log.id} className="border-b last:border-0 align-top">
                <td className="p-3 text-xs text-slate-500">{formatearFechaHora(log.fecha_creacion)}</td>
                <td className="p-3">{log.usuario_correo || (log.id_usuario ? '—' : 'Sistema')}</td>
                <td className="p-3 font-medium">{ETIQUETAS_ACCION[log.accion] ?? log.accion}</td>
                <td className="p-3">{log.entidad}{log.id_entidad ? ` #${log.id_entidad}` : ''}</td>
                <td className="max-w-md p-3 text-xs text-slate-600 dark:text-slate-300">{resumenDetalle(log.detalle) || '—'}</td>
                <td className="p-3 text-xs">{log.direccion_ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(logs.data?.results.length ?? 0) === 0 && !logs.isLoading && (
          <div className="flex flex-col items-center py-10 text-center text-slate-500">
            <BookOpenCheck className="h-9 w-9" />
            <p className="mt-2">Sin registros con esos filtros</p>
          </div>
        )}
      </div>
      {logs.data && <Paginacion pagina={pagina} total={logs.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={logs.isFetching} />}
    </div>
  );
}
