import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutList, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  actualizarRecurso,
  crearRecurso,
  eliminarRecurso,
  ETIQUETAS_AMBITO,
  listarRecursos,
  type AmbitoRecurso,
  type DatosRecurso,
  type RecursoAdmin,
} from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import { claves } from '../../lib/queryKeys';

const VACIO: DatosRecurso = {
  codigo: '',
  nombre: '',
  descripcion: '',
  ambito: 'panel_admin',
  ruta: '',
  icono: '',
  grupo: '',
  orden: 0,
  es_publico: false,
  activo: true,
};

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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
            <tbody>
              {recursos.data.map((recurso) => (
                <tr key={recurso.id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      {recurso.nombre}
                      {recurso.es_sistema && <Lock className="h-3 w-3 text-slate-400" aria-label="Recurso de sistema" />}
                      {!recurso.activo && <span className="badge bg-amber-100 text-amber-800">Inactivo</span>}
                      {recurso.es_publico && <span className="badge bg-sky-100 text-sky-800">Público</span>}
                    </p>
                    <p className="text-xs text-slate-400">{recurso.codigo}</p>
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

function FormularioRecurso({
  recurso,
  onCerrar,
  onGuardado,
}: {
  recurso: RecursoAdmin | 'nuevo' | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const toast = useToast();
  const existente = recurso && recurso !== 'nuevo' ? recurso : null;
  const sistema = existente?.es_sistema ?? false;
  const [datos, setDatos] = useState<DatosRecurso>(VACIO);
  const [error, setError] = useState('');
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setDatos(existente ? { ...VACIO, ...existente } : VACIO);
    setError('');
    setErrores({});
  }, [recurso, existente]);

  const campo = <K extends keyof DatosRecurso>(clave: K, valor: DatosRecurso[K]) =>
    setDatos((actual) => ({ ...actual, [clave]: valor }));

  const guardar = useMutation({
    mutationFn: () => {
      if (!existente) return crearRecurso(datos);
      // En un recurso de sistema solo se envían los campos editables.
      const { nombre, descripcion, icono, grupo, orden } = datos;
      return actualizarRecurso(existente.id, sistema ? { nombre, descripcion, icono, grupo, orden } : datos);
    },
    onSuccess: () => {
      toast.exito(existente ? 'Recurso actualizado.' : 'Recurso creado.');
      onGuardado();
    },
    onError: (fallo) => {
      setErrores(erroresDeCampo(fallo));
      setError(mensajeDeError(fallo));
    },
  });

  const enviar = () => {
    if (!datos.codigo.trim() || !datos.nombre.trim()) {
      setError('El código y el nombre son obligatorios.');
      return;
    }
    if (datos.ruta && !datos.ruta.startsWith('/')) {
      setError('La ruta debe estar vacía o empezar con «/».');
      return;
    }
    setError('');
    guardar.mutate();
  };

  return (
    <Modal
      abierto={recurso !== null}
      onCerrar={onCerrar}
      titulo={existente ? `Editar «${existente.codigo}»` : 'Nuevo recurso'}
      ancho="max-w-xl"
    >
      {sistema && (
        <p className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Es un recurso de sistema: código, ruta, ámbito, visibilidad pública y estado no se pueden cambiar.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Código" htmlFor="rec-codigo" error={errores.codigo?.[0]} ayuda="Ej.: admin.reportes">
          <input id="rec-codigo" className="input" value={datos.codigo} disabled={sistema} onChange={(e) => campo('codigo', e.target.value)} />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor="rec-nombre" error={errores.nombre?.[0]}>
          <input id="rec-nombre" className="input" value={datos.nombre} maxLength={80} onChange={(e) => campo('nombre', e.target.value)} />
        </Campo>
        <Campo etiqueta="Ámbito" htmlFor="rec-ambito">
          <select id="rec-ambito" className="input" value={datos.ambito} disabled={sistema} onChange={(e) => campo('ambito', e.target.value as AmbitoRecurso)}>
            {Object.entries(ETIQUETAS_AMBITO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Ruta" htmlFor="rec-ruta" error={errores.ruta?.[0]} ayuda="Vacía si no aparece en el menú.">
          <input id="rec-ruta" className="input" value={datos.ruta} disabled={sistema} onChange={(e) => campo('ruta', e.target.value)} />
        </Campo>
        <Campo etiqueta="Icono (lucide)" htmlFor="rec-icono">
          <input id="rec-icono" className="input" value={datos.icono} onChange={(e) => campo('icono', e.target.value)} />
        </Campo>
        <Campo etiqueta="Grupo del menú" htmlFor="rec-grupo">
          <input id="rec-grupo" className="input" value={datos.grupo} onChange={(e) => campo('grupo', e.target.value)} />
        </Campo>
        <Campo etiqueta="Orden" htmlFor="rec-orden">
          <input id="rec-orden" type="number" min={0} className="input" value={datos.orden} onChange={(e) => campo('orden', Number(e.target.value) || 0)} />
        </Campo>
        <Campo etiqueta="Descripción" htmlFor="rec-descripcion">
          <input id="rec-descripcion" className="input" value={datos.descripcion} maxLength={200} onChange={(e) => campo('descripcion', e.target.value)} />
        </Campo>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={datos.es_publico} disabled={sistema} onChange={(e) => campo('es_publico', e.target.checked)} />
          Visible sin sesión
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={datos.activo} disabled={sistema} onChange={(e) => campo('activo', e.target.checked)} />
          Activo
        </label>
      </div>
      <ErrorCampo mensaje={error} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={enviar} disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}
