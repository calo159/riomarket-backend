import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  asignarRolesUsuario,
  cambiarRolUsuario,
  listarRoles,
  listarUsuarios,
  reactivarUsuario,
  suspenderUsuario,
  type UsuarioAdmin,
} from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { formatearFecha, ETIQUETAS_ROL, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import type { Rol } from '../../lib/types';
import { claves } from '../../lib/queryKeys';

const TAMANO = 15;
const ROLES: Rol[] = ['comprador', 'vendedor', 'administrador'];

function advertenciaRol(rol: Rol): string {
  if (rol === 'vendedor') {
    return 'Se creará o reutilizará su registro de vendedor. Si no está verificado, no podrá publicar hasta que un administrador apruebe su cédula.';
  }
  if (rol === 'administrador') {
    return 'La cuenta tendrá acceso total a la administración del marketplace. Usa este rol solo para personas de confianza.';
  }
  return 'Sus puestos activos pasarán a inactivo y dejarán de aparecer en el catálogo; la verificación y los datos se conservan.';
}

function EstadoUsuarioBadge({ estado }: { estado: string }) {
  const clase =
    estado === 'activo'
      ? 'bg-verde-100 text-verde-800 dark:bg-verde-950 dark:text-verde-300'
      : 'bg-rojo-100 text-rojo-800 dark:bg-rojo-950 dark:text-rojo-300';
  return <span className={`badge ${clase}`}>{estado}</span>;
}

function ChipsRoles({ usuario }: { usuario: UsuarioAdmin }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {usuario.roles_asignados
        .filter((rol) => !rol.es_sistema)
        .map((rol) => (
          <span key={rol.id} className="badge bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            {rol.nombre}
          </span>
        ))}
    </div>
  );
}

export function Usuarios() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('');
  const [rolAsignado, setRolAsignado] = useState('');
  const [objetivo, setObjetivo] = useState<UsuarioAdmin | null>(null);

  useEffect(() => {
    document.title = 'Usuarios · Administración · RioMarket';
  }, []);

  const usuarios = useQuery({
    queryKey: claves.usuarios.lista(pagina, busqueda, rol, estado, rolAsignado),
    queryFn: () =>
      listarUsuarios({
        page: pagina,
        page_size: TAMANO,
        q: busqueda.trim() || undefined,
        rol: rol || undefined,
        estado: estado || undefined,
        rol_asignado: rolAsignado ? Number(rolAsignado) : undefined,
      }),
    placeholderData: (anterior) => anterior,
  });
  const roles = useQuery({ queryKey: claves.adminRoles, queryFn: listarRoles });

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.usuarios.todos });
    void queryClient.invalidateQueries({ queryKey: claves.adminRoles });
    void queryClient.invalidateQueries({ queryKey: claves.adminResumen });
    void invalidarMenu(queryClient);
  };

  const cambiarFiltro = (fijar: (valor: string) => void) => (evento: { target: { value: string } }) => {
    fijar(evento.target.value);
    setPagina(1);
  };

  // El usuario abierto en el modal se mantiene actualizado tras cada acción.
  const actual = objetivo ? usuarios.data?.results.find((u) => u.id === objetivo.id) ?? objetivo : null;

  return (
    <div>
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Gestiona el rol base, los roles adicionales y el baneo de cada cuenta. Toda decisión queda auditada."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-64 pl-9"
            placeholder="Nombre, correo o celular"
            value={busqueda}
            onChange={cambiarFiltro(setBusqueda)}
            aria-label="Buscar usuario"
          />
        </div>
        <select className="input w-auto" value={rol} onChange={cambiarFiltro(setRol)} aria-label="Filtrar por rol base">
          <option value="">Todos los roles base</option>
          <option value="comprador">Compradores</option>
          <option value="vendedor">Vendedores</option>
          <option value="administrador">Administradores</option>
        </select>
        <select className="input w-auto" value={estado} onChange={cambiarFiltro(setEstado)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
        </select>
        <select className="input w-auto" value={rolAsignado} onChange={cambiarFiltro(setRolAsignado)} aria-label="Filtrar por rol asignado">
          <option value="">Cualquier rol asignado</option>
          {roles.data?.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
          ))}
        </select>
      </div>

      {usuarios.isLoading && <CargandoBloque mensaje="Cargando usuarios…" />}
      {usuarios.isError && <EstadoError mensaje="No pudimos cargar los usuarios." onReintentar={() => void usuarios.refetch()} />}
      {usuarios.data && usuarios.data.results.length === 0 && (
        <EstadoVacio titulo="Sin usuarios" descripcion="No hay cuentas que coincidan con los filtros." />
      )}

      {usuarios.data && usuarios.data.results.length > 0 && (
        <>
          <div className="hidden overflow-x-auto card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">Cuenta</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Pedidos</th>
                  <th className="p-3">Puestos</th>
                  <th className="p-3 text-right">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.data.results.map((usuario) => (
                  <tr key={usuario.id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{usuario.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{usuario.correo} · {usuario.celular}</p>
                      <p className="text-xs text-slate-400">Desde {formatearFecha(usuario.fecha_registro)}</p>
                    </td>
                    <td className="p-3">
                      <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</span>
                      <ChipsRoles usuario={usuario} />
                      {usuario.rol === 'vendedor' && usuario.estado_verificacion && (
                        <p className="mt-1 text-xs text-slate-500">{ETIQUETAS_VERIFICACION[usuario.estado_verificacion] ?? usuario.estado_verificacion}</p>
                      )}
                    </td>
                    <td className="p-3"><EstadoUsuarioBadge estado={usuario.estado} /></td>
                    <td className="p-3 text-xs text-slate-500">
                      {usuario.pedidos_como_comprador} como comprador
                      {usuario.pedidos_activos > 0 && <span className="ml-1 font-semibold text-sol-700 dark:text-sol-300">({usuario.pedidos_activos} activos)</span>}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {usuario.puestos.length === 0 ? '—' : (
                        <ul className="space-y-0.5">
                          {usuario.puestos.map((puesto) => (
                            <li key={puesto.id}>{puesto.nombre} <span className="text-slate-400">({puesto.estado})</span></li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-3 text-right"><BotonAcceso usuario={usuario} onAbrir={setObjetivo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {usuarios.data.results.map((usuario) => (
              <article key={usuario.id} className="card space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{usuario.nombre}</p>
                    <p className="truncate text-xs text-slate-500">{usuario.correo}</p>
                  </div>
                  <EstadoUsuarioBadge estado={usuario.estado} />
                </div>
                <p className="text-xs text-slate-500">
                  {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol} · {usuario.pedidos_como_comprador} pedidos
                  {usuario.pedidos_activos > 0 && ` · ${usuario.pedidos_activos} activos`}
                </p>
                <ChipsRoles usuario={usuario} />
                <BotonAcceso usuario={usuario} onAbrir={setObjetivo} />
              </article>
            ))}
          </div>

          <Paginacion pagina={pagina} total={usuarios.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={usuarios.isFetching} />
        </>
      )}

      {actual && (
        <GestionarAcceso
          key={actual.id}
          usuario={actual}
          rolesPersonalizados={(roles.data ?? []).filter((r) => !r.es_sistema)}
          onCerrar={() => setObjetivo(null)}
          onCambio={refrescar}
        />
      )}
    </div>
  );
}

function BotonAcceso({ usuario, onAbrir }: { usuario: UsuarioAdmin; onAbrir: (usuario: UsuarioAdmin) => void }) {
  if (usuario.acciones_permitidas.length === 0) {
    return <span className="text-xs text-slate-400">Sin acciones</span>;
  }
  return (
    <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => onAbrir(usuario)}>
      <KeyRound className="h-3.5 w-3.5" /> Gestionar acceso
    </button>
  );
}

/** Modal con tres secciones independientes: rol base, roles adicionales y baneo. */
function GestionarAcceso({
  usuario,
  rolesPersonalizados,
  onCerrar,
  onCambio,
}: {
  usuario: UsuarioAdmin;
  rolesPersonalizados: { id: number; nombre: string; activo: boolean }[];
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const toast = useToast();
  const puede = (accion: string) => usuario.acciones_permitidas.includes(accion as never);

  const [nuevoRol, setNuevoRol] = useState<Rol>(usuario.rol === 'comprador' ? 'vendedor' : 'comprador');
  const [motivoRol, setMotivoRol] = useState('');
  const [errorRol, setErrorRol] = useState('');

  const [seleccion, setSeleccion] = useState<Set<number>>(
    new Set(usuario.roles_asignados.filter((r) => !r.es_sistema).map((r) => r.id)),
  );
  const [motivoRoles, setMotivoRoles] = useState('');
  const [errorRoles, setErrorRoles] = useState('');

  const [motivoBan, setMotivoBan] = useState('');
  const [errorBan, setErrorBan] = useState('');

  const cambiarRol = useMutation({
    mutationFn: () => cambiarRolUsuario(usuario.id, { rol: nuevoRol, motivo: motivoRol.trim() }),
    onSuccess: (u) => {
      onCambio();
      setMotivoRol('');
      toast.exito(`Rol de ${u.nombre} actualizado a ${ETIQUETAS_ROL[u.rol]}.`);
    },
    onError: (fallo) => setErrorRol(mensajeDeError(fallo)),
  });

  const guardarRoles = useMutation({
    mutationFn: () => asignarRolesUsuario(usuario.id, { roles: [...seleccion], motivo: motivoRoles.trim() }),
    onSuccess: (u) => {
      onCambio();
      setMotivoRoles('');
      toast.exito(`Roles adicionales de ${u.nombre} actualizados.`);
    },
    onError: (fallo) => setErrorRoles(mensajeDeError(fallo)),
  });

  const suspender = useMutation({
    mutationFn: () => suspenderUsuario(usuario.id, motivoBan.trim()),
    onSuccess: (u) => {
      onCambio();
      setMotivoBan('');
      toast.exito(`${u.nombre} fue baneado. Sus sesiones se cerraron.`);
    },
    onError: (fallo) => setErrorBan(mensajeDeError(fallo)),
  });

  const reactivar = useMutation({
    mutationFn: () => reactivarUsuario(usuario.id),
    onSuccess: (u) => {
      onCambio();
      toast.exito(`${u.nombre} puede iniciar sesión de nuevo.`);
    },
    onError: (fallo) => setErrorBan(mensajeDeError(fallo)),
  });

  const validarMotivo = (texto: string, fijarError: (mensaje: string) => void) => {
    if (texto.trim().length < 5) {
      fijarError('Indica un motivo de al menos 5 caracteres.');
      return false;
    }
    fijarError('');
    return true;
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Gestionar acceso de ${usuario.nombre}`} ancho="max-w-xl">
      <p className="mb-4 text-xs text-slate-500">
        {usuario.correo} · rol base {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol} · {usuario.estado}
      </p>

      {puede('cambiar-rol') && (
        <section className="mb-5 space-y-2" aria-labelledby="sec-rol-base">
          <h3 id="sec-rol-base" className="text-sm font-semibold">1. Rol base</h3>
          <Campo etiqueta="Nuevo rol base" htmlFor="nuevo-rol">
            <select id="nuevo-rol" className="input" value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as Rol)}>
              {ROLES.filter((opcion) => opcion !== usuario.rol).map((opcion) => (
                <option key={opcion} value={opcion}>{ETIQUETAS_ROL[opcion]}</option>
              ))}
            </select>
          </Campo>
          <div className="rounded-xl border border-sol-200 bg-sol-50 p-3 text-xs text-sol-900 dark:border-sol-900 dark:bg-sol-950/40 dark:text-sol-200">
            {advertenciaRol(nuevoRol)}
            {usuario.pedidos_activos > 0 && (
              <p className="mt-1 font-semibold">Esta cuenta tiene {usuario.pedidos_activos} pedido(s) activo(s); el cambio se rechazará hasta resolverlos.</p>
            )}
          </div>
          <Campo etiqueta="Motivo del cambio de rol (obligatorio)" htmlFor="motivo-rol">
            <textarea id="motivo-rol" rows={2} className="input" value={motivoRol} onChange={(e) => setMotivoRol(e.target.value)} />
          </Campo>
          <ErrorCampo mensaje={errorRol} />
          <button
            type="button"
            className="btn-primary"
            disabled={cambiarRol.isPending}
            onClick={() => validarMotivo(motivoRol, setErrorRol) && cambiarRol.mutate()}
          >
            {cambiarRol.isPending ? 'Guardando…' : 'Cambiar rol base'}
          </button>
        </section>
      )}

      {puede('roles') && (
        <section className="mb-5 space-y-2 border-t pt-4" aria-labelledby="sec-roles">
          <h3 id="sec-roles" className="text-sm font-semibold">2. Roles adicionales</h3>
          {rolesPersonalizados.length === 0 ? (
            <p className="text-xs text-slate-500">Todavía no hay roles personalizados. Créalos en Roles.</p>
          ) : (
            <ul className="space-y-1">
              {rolesPersonalizados.map((opcion) => (
                <li key={opcion.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={seleccion.has(opcion.id)}
                      onChange={(e) =>
                        setSeleccion((previa) => {
                          const nueva = new Set(previa);
                          if (e.target.checked) nueva.add(opcion.id);
                          else nueva.delete(opcion.id);
                          return nueva;
                        })
                      }
                    />
                    {opcion.nombre}
                    {!opcion.activo && <span className="text-xs text-sol-600">(inactivo: no otorga nada)</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <Campo etiqueta="Motivo de los roles adicionales (obligatorio)" htmlFor="motivo-roles">
            <textarea id="motivo-roles" rows={2} className="input" value={motivoRoles} onChange={(e) => setMotivoRoles(e.target.value)} />
          </Campo>
          <ErrorCampo mensaje={errorRoles} />
          <button
            type="button"
            className="btn-primary"
            disabled={guardarRoles.isPending}
            onClick={() => validarMotivo(motivoRoles, setErrorRoles) && guardarRoles.mutate()}
          >
            {guardarRoles.isPending ? 'Guardando…' : 'Guardar roles adicionales'}
          </button>
        </section>
      )}

      {(puede('suspender') || puede('reactivar')) && (
        <section className="space-y-2 border-t pt-4" aria-labelledby="sec-ban">
          <h3 id="sec-ban" className="text-sm font-semibold">3. Banear (suspender)</h3>
          {puede('suspender') ? (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                La cuenta no podrá iniciar sesión, se cerrarán sus sesiones y sus puestos activos pasarán a suspendidos. Conserva su rol, sus roles y su historial.
              </p>
              <Campo etiqueta="Motivo del baneo (obligatorio)" htmlFor="motivo-ban">
                <textarea id="motivo-ban" rows={2} className="input" value={motivoBan} onChange={(e) => setMotivoBan(e.target.value)} />
              </Campo>
              <ErrorCampo mensaje={errorBan} />
              <button
                type="button"
                className="btn-danger"
                disabled={suspender.isPending}
                onClick={() => validarMotivo(motivoBan, setErrorBan) && suspender.mutate()}
              >
                <ShieldOff className="h-4 w-4" /> {suspender.isPending ? 'Suspendiendo…' : 'Suspender cuenta'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                La cuenta podrá iniciar sesión de nuevo. Sus puestos no se reactivan solos: gestiónalos desde Puestos.
              </p>
              <ErrorCampo mensaje={errorBan} />
              <button type="button" className="btn-primary" disabled={reactivar.isPending} onClick={() => reactivar.mutate()}>
                <ShieldCheck className="h-4 w-4" /> {reactivar.isPending ? 'Reactivando…' : 'Reactivar cuenta'}
              </button>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
