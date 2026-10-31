import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  actualizarRol,
  crearRol,
  eliminarRol,
  ETIQUETAS_AMBITO,
  fijarRecursosRol,
  listarRecursos,
  listarRoles,
  RECURSOS_OBLIGATORIOS_ADMIN,
  type RecursoAdmin,
  type RolAdmin,
} from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import { claves } from '../../lib/queryKeys';

type Vista = 'lista' | 'matriz';

/** Un rol "administrador" de sistema no puede perder los recursos que sostienen el panel. */
function esObligatorio(rol: RolAdmin, recurso: RecursoAdmin): boolean {
  return rol.es_sistema && rol.nombre === 'administrador' && RECURSOS_OBLIGATORIOS_ADMIN.includes(recurso.codigo);
}

function agruparRecursos(recursos: RecursoAdmin[]): { clave: string; titulo: string; items: RecursoAdmin[] }[] {
  const grupos: { clave: string; titulo: string; items: RecursoAdmin[] }[] = [];
  for (const recurso of recursos) {
    const clave = `${recurso.ambito}|${recurso.grupo}`;
    let grupo = grupos.find((g) => g.clave === clave);
    if (!grupo) {
      const base = ETIQUETAS_AMBITO[recurso.ambito] ?? recurso.ambito;
      grupo = { clave, titulo: recurso.grupo ? `${base} · ${recurso.grupo}` : base, items: [] };
      grupos.push(grupo);
    }
    grupo.items.push(recurso);
  }
  return grupos;
}

export function RolesAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [vista, setVista] = useState<Vista>('lista');
  const [edicion, setEdicion] = useState<RolAdmin | 'nuevo' | null>(null);
  const [permisos, setPermisos] = useState<RolAdmin | null>(null);
  const [aEliminar, setAEliminar] = useState<RolAdmin | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  useEffect(() => {
    document.title = 'Roles · Administración · RioMarket';
  }, []);

  const roles = useQuery({ queryKey: claves.adminRoles, queryFn: listarRoles });
  const recursos = useQuery({ queryKey: claves.adminRecursos.todos, queryFn: () => listarRecursos() });

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.adminRoles });
    void queryClient.invalidateQueries({ queryKey: claves.usuarios.todos });
    void invalidarMenu(queryClient);
  };

  const eliminar = useMutation({
    mutationFn: (id: number) => eliminarRol(id),
    onSuccess: () => {
      refrescar();
      setAEliminar(null);
      toast.exito('Rol eliminado.');
    },
    onError: (fallo) => setErrorEliminar(mensajeDeError(fallo)),
  });

  const cambiarCelda = useMutation({
    mutationFn: ({ rol, recurso, marcado }: { rol: RolAdmin; recurso: RecursoAdmin; marcado: boolean }) => {
      const ids = new Set(rol.recursos);
      if (marcado) ids.add(recurso.id);
      else ids.delete(recurso.id);
      return fijarRecursosRol(rol.id, { recursos: [...ids], motivo: 'Ajuste desde la matriz de permisos' });
    },
    onSuccess: refrescar,
    onError: (fallo) => toast.error(mensajeDeError(fallo)),
  });

  const cargando = roles.isLoading || recursos.isLoading;
  const fallo = roles.isError || recursos.isError;

  return (
    <div>
      <EncabezadoPagina
        titulo="Roles"
        descripcion="Un rol agrupa recursos (pantallas). Quien tenga el rol ve esos recursos en su menú."
        acciones={
          <button type="button" className="btn-primary" onClick={() => setEdicion('nuevo')}>
            <Plus className="h-4 w-4" /> Nuevo rol
          </button>
        }
      />

      <div className="mb-4 inline-flex rounded-xl border p-1" role="tablist" aria-label="Vista de roles">
        {(['lista', 'matriz'] as Vista[]).map((opcion) => (
          <button
            key={opcion}
            type="button"
            role="tab"
            aria-selected={vista === opcion}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${vista === opcion ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            onClick={() => setVista(opcion)}
          >
            {opcion === 'lista' ? 'Lista' : 'Matriz'}
          </button>
        ))}
      </div>

      {cargando && <CargandoBloque mensaje="Cargando roles…" />}
      {fallo && <EstadoError mensaje="No pudimos cargar los roles." onReintentar={() => void roles.refetch()} />}

      {roles.data && recursos.data && roles.data.length === 0 && (
        <EstadoVacio titulo="Sin roles" descripcion="Crea el primer rol personalizado." icono={<KeyRound className="h-9 w-9" />} />
      )}

      {roles.data && recursos.data && vista === 'lista' && (
        <div className="grid gap-3 md:grid-cols-2">
          {roles.data.map((rol) => (
            <article key={rol.id} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-semibold">
                    {rol.nombre}
                    {rol.es_sistema && (
                      <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Lock className="h-3 w-3" /> Sistema
                      </span>
                    )}
                    {!rol.activo && <span className="badge bg-amber-100 text-amber-800">Inactivo</span>}
                  </h2>
                  {rol.descripcion && <p className="text-sm text-slate-500 dark:text-slate-400">{rol.descripcion}</p>}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {rol.total_usuarios} usuario(s) · {rol.total_recursos} recurso(s)
              </p>
              <div className="flex flex-wrap gap-1">
                <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setPermisos(rol)}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Permisos
                </button>
                <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setEdicion(rol)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                {!rol.es_sistema && (
                  <button
                    type="button"
                    className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400"
                    onClick={() => {
                      setErrorEliminar('');
                      setAEliminar(rol);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {roles.data && recursos.data && vista === 'matriz' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Recurso</th>
                {roles.data.map((rol) => (
                  <th key={rol.id} className="p-3 text-center">{rol.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody className="entra-lista">
              {agruparRecursos(recursos.data).map((grupo) => (
                <FilasGrupo key={grupo.clave} titulo={grupo.titulo} columnas={roles.data.length + 1}>
                  {grupo.items.map((recurso) => (
                    <tr key={recurso.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium">{recurso.nombre}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{recurso.codigo}</p>
                      </td>
                      {roles.data.map((rol) => {
                        const bloqueado = esObligatorio(rol, recurso);
                        return (
                          <td key={rol.id} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={rol.recursos.includes(recurso.id)}
                              disabled={bloqueado || cambiarCelda.isPending}
                              onChange={(evento) =>
                                cambiarCelda.mutate({ rol, recurso, marcado: evento.target.checked })
                              }
                              aria-label={`${rol.nombre} puede abrir ${recurso.nombre}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </FilasGrupo>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormularioRol
        rol={edicion}
        onCerrar={() => setEdicion(null)}
        onGuardado={() => {
          refrescar();
          setEdicion(null);
        }}
      />

      {permisos && recursos.data && (
        <PermisosModal
          rol={roles.data?.find((r) => r.id === permisos.id) ?? permisos}
          recursos={recursos.data}
          onCerrar={() => setPermisos(null)}
          onGuardado={() => {
            refrescar();
            setPermisos(null);
          }}
        />
      )}

      <ConfirmarModal
        abierto={aEliminar !== null}
        titulo={`¿Eliminar el rol «${aEliminar?.nombre ?? ''}»?`}
        descripcion={
          errorEliminar ||
          'Se borrarán sus vínculos con los recursos. Si tiene usuarios asignados no se podrá eliminar: desactívalo en su lugar.'
        }
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => aEliminar && eliminar.mutate(aEliminar.id)}
        onCerrar={() => setAEliminar(null)}
      />
    </div>
  );
}

function FilasGrupo({ titulo, columnas, children }: { titulo: string; columnas: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-slate-50 dark:bg-slate-800/50">
        <th colSpan={columnas} className="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          {titulo}
        </th>
      </tr>
      {children}
    </>
  );
}

function FormularioRol({
  rol,
  onCerrar,
  onGuardado,
}: {
  rol: RolAdmin | 'nuevo' | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const toast = useToast();
  const existente = rol && rol !== 'nuevo' ? rol : null;
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setNombre(existente?.nombre ?? '');
    setDescripcion(existente?.descripcion ?? '');
    setActivo(existente?.activo ?? true);
    setError('');
  }, [rol, existente]);

  const guardar = useMutation({
    mutationFn: () =>
      existente
        ? actualizarRol(existente.id, existente.es_sistema ? { descripcion } : { nombre, descripcion, activo })
        : crearRol({ nombre, descripcion, activo }),
    onSuccess: () => {
      toast.exito(existente ? 'Rol actualizado.' : 'Rol creado.');
      onGuardado();
    },
    onError: (fallo) => setError(mensajeDeError(fallo)),
  });

  const enviar = () => {
    if (nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    setError('');
    guardar.mutate();
  };

  return (
    <Modal abierto={rol !== null} onCerrar={onCerrar} titulo={existente ? `Editar rol «${existente.nombre}»` : 'Nuevo rol'}>
      {existente?.es_sistema && (
        <p className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Es un rol de sistema: solo puedes editar su descripción.
        </p>
      )}
      <Campo etiqueta="Nombre" htmlFor="rol-nombre">
        <input
          id="rol-nombre"
          className="input"
          value={nombre}
          maxLength={40}
          disabled={existente?.es_sistema}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </Campo>
      <Campo etiqueta="Descripción" htmlFor="rol-descripcion" className="mt-3">
        <input
          id="rol-descripcion"
          className="input"
          value={descripcion}
          maxLength={200}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </Campo>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={activo}
          disabled={existente?.es_sistema}
          onChange={(evento) => setActivo(evento.target.checked)}
        />
        Rol activo (un rol inactivo no otorga ningún recurso)
      </label>
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

function PermisosModal({
  rol,
  recursos,
  onCerrar,
  onGuardado,
}: {
  rol: RolAdmin;
  recursos: RecursoAdmin[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const toast = useToast();
  const [marcados, setMarcados] = useState<Set<number>>(new Set(rol.recursos));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const grupos = useMemo(() => agruparRecursos(recursos), [recursos]);
  const hayObligatorios = recursos.some((recurso) => esObligatorio(rol, recurso));

  const guardar = useMutation({
    mutationFn: () => fijarRecursosRol(rol.id, { recursos: [...marcados], motivo: motivo.trim() }),
    onSuccess: () => {
      toast.exito('Permisos actualizados. Los menús cambian de inmediato.');
      onGuardado();
    },
    onError: (fallo) => setError(mensajeDeError(fallo)),
  });

  const alternar = (id: number, valor: boolean) =>
    setMarcados((actual) => {
      const nuevo = new Set(actual);
      if (valor) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });

  const alternarGrupo = (items: RecursoAdmin[], valor: boolean) =>
    setMarcados((actual) => {
      const nuevo = new Set(actual);
      for (const recurso of items) {
        if (esObligatorio(rol, recurso)) continue;
        if (valor) nuevo.add(recurso.id);
        else nuevo.delete(recurso.id);
      }
      return nuevo;
    });

  const enviar = () => {
    if (motivo.trim().length < 5) {
      setError('Indica un motivo de al menos 5 caracteres.');
      return;
    }
    setError('');
    guardar.mutate();
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Permisos de «${rol.nombre}»`} ancho="max-w-2xl">
      {hayObligatorios && (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Los recursos con candado son obligatorios para el rol administrador: sin ellos nadie podría seguir administrando el sistema.
        </p>
      )}
      <div className="space-y-4">
        {grupos.map((grupo) => {
          const editables = grupo.items.filter((recurso) => !esObligatorio(rol, recurso));
          const todos = editables.length > 0 && editables.every((recurso) => marcados.has(recurso.id));
          return (
            <fieldset key={grupo.clave} className="rounded-xl border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo.titulo}</legend>
              {editables.length > 0 && (
                <label className="mb-2 flex items-center gap-2 text-xs font-medium text-brand-700 dark:text-brand-300">
                  <input type="checkbox" checked={todos} onChange={(evento) => alternarGrupo(grupo.items, evento.target.checked)} />
                  Marcar todo el grupo
                </label>
              )}
              <ul className="grid gap-1 sm:grid-cols-2">
                {grupo.items.map((recurso) => {
                  const bloqueado = esObligatorio(rol, recurso);
                  return (
                    <li key={recurso.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={marcados.has(recurso.id)}
                          disabled={bloqueado}
                          onChange={(evento) => alternar(recurso.id, evento.target.checked)}
                        />
                        {recurso.nombre}
                        {bloqueado && <Lock className="h-3 w-3 text-slate-500 dark:text-slate-400" aria-label="Obligatorio" />}
                        {!recurso.activo && <span className="text-xs text-amber-600">(inactivo)</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
      <Campo etiqueta="Motivo (obligatorio)" htmlFor="permisos-motivo" className="mt-4">
        <textarea
          id="permisos-motivo"
          rows={2}
          className="input"
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Explica el cambio de permisos (mínimo 5 caracteres)."
        />
      </Campo>
      <ErrorCampo mensaje={error} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={enviar} disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar permisos'}
        </button>
      </div>
    </Modal>
  );
}
