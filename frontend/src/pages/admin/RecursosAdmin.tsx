import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutList, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { eliminarRecurso, ETIQUETAS_AMBITO, listarRecursos, type RecursoAdmin } from '../../api/admin';
import { FormularioRecurso } from '../../components/admin/FormularioRecurso';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { ConfirmarModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import { claves } from '../../lib/queryKeys';

export function RecursosAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [ambito, setAmbito] = useState('');
  const [activo, setActivo] = useState('');
  const [edicion, setEdicion] = useState<RecursoAdmin | 'nuevo' | null>(null);
  const [aEliminar, setAEliminar] = useState<RecursoAdmin | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  useEffect(() => {
    document.title = 'Recursos · Administración · RioMarket';
  }, []);

  const recursos = useQuery({
    queryKey: claves.adminRecursos.lista(busqueda, ambito, activo),
    queryFn: () =>
      listarRecursos({ q: busqueda.trim() || undefined, ambito: ambito || undefined, activo: activo || undefined }),
  });

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.adminRecursos.todos });
    void queryClient.invalidateQueries({ queryKey: claves.adminRoles });
    void invalidarMenu(queryClient);
  };

  const eliminar = useMutation({
    mutationFn: (id: number) => eliminarRecurso(id),
    onSuccess: (resultado) => {
      refrescar();
      setAEliminar(null);
      toast.exito(`Recurso eliminado. ${resultado.roles_afectados} rol(es) lo perdieron.`);
    },
    onError: (fallo) => setErrorEliminar(mensajeDeError(fallo)),
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Recursos"
        descripcion="Los recursos son los módulos o pantallas del sistema. Un rol decide cuáles puede abrir."
        acciones={
          <button type="button" className="btn-primary" onClick={() => setEdicion('nuevo')}>
            <Plus className="h-4 w-4" /> Nuevo recurso
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            className="input w-64 pl-9"
            placeholder="Código o nombre"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            aria-label="Buscar recurso"
          />
        </div>
        <select className="input w-auto" value={ambito} onChange={(evento) => setAmbito(evento.target.value)} aria-label="Filtrar por ámbito">
          <option value="">Todos los ámbitos</option>
          {Object.entries(ETIQUETAS_AMBITO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
        <select className="input w-auto" value={activo} onChange={(evento) => setActivo(evento.target.value)} aria-label="Filtrar por estado">
          <option value="">Activos e inactivos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {recursos.isLoading && <CargandoBloque mensaje="Cargando recursos…" />}
      {recursos.isError && <EstadoError mensaje="No pudimos cargar los recursos." onReintentar={() => void recursos.refetch()} />}
      {recursos.data && recursos.data.length === 0 && (
        <EstadoVacio titulo="Sin recursos" descripcion="No hay recursos con esos filtros." icono={<LayoutList className="h-9 w-9" />} />
      )}

      {recursos.data && recursos.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Recurso</th>
                <th className="p-3">Ámbito</th>
                <th className="p-3">Ruta</th>
                <th className="p-3">Roles</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="entra-lista">
              {recursos.data.map((recurso) => (
                <tr key={recurso.id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      {recurso.nombre}
                      {recurso.es_sistema && <Lock className="h-3 w-3 text-slate-500 dark:text-slate-400" aria-label="Recurso de sistema" />}
                      {!recurso.activo && <span className="badge bg-amber-100 text-amber-800">Inactivo</span>}
                      {recurso.es_publico && <span className="badge bg-sky-100 text-sky-800">Público</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{recurso.codigo}</p>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {ETIQUETAS_AMBITO[recurso.ambito]}
                    {recurso.grupo && ` · ${recurso.grupo}`}
                  </td>
                  <td className="p-3 text-xs text-slate-500">{recurso.ruta || '—'}</td>
                  <td className="p-3 text-xs text-slate-500">{recurso.total_roles}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setEdicion(recurso)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      {!recurso.es_sistema && (
                        <button
                          type="button"
                          className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400"
                          onClick={() => {
                            setErrorEliminar('');
                            setAEliminar(recurso);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormularioRecurso
        recurso={edicion}
        onCerrar={() => setEdicion(null)}
        onGuardado={() => {
          refrescar();
          setEdicion(null);
        }}
      />

      <ConfirmarModal
        abierto={aEliminar !== null}
        titulo={`¿Eliminar el recurso «${aEliminar?.codigo ?? ''}»?`}
        descripcion={
          errorEliminar ||
          `Se quitará de ${aEliminar?.total_roles ?? 0} rol(es) y desaparecerá de sus menús. No se puede deshacer.`
        }
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => aEliminar && eliminar.mutate(aEliminar.id)}
        onCerrar={() => setAEliminar(null)}
      />
    </div>
  );
}
