import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Search, ShieldOff, ShieldCheck, Users } from 'lucide-react';
import {
  cambiarRolUsuario,
  listarUsuarios,
  reactivarUsuario,
  suspenderUsuario,
  type UsuarioAdmin,
} from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { ConfirmarModal, Modal } from '../../components/ui/Modal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { useToast } from '../../components/ui/Toast';
import { formatearFecha, ETIQUETAS_ROL, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import type { Rol } from '../../lib/types';

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

export function Usuarios() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('');
  const [objetivo, setObjetivo] = useState<UsuarioAdmin | null>(null);
  const [modal, setModal] = useState<'rol' | 'suspender' | 'reactivar' | null>(null);
  const [nuevoRol, setNuevoRol] = useState<Rol>('comprador');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Usuarios · Administración · RioMarket';
  }, []);

  const usuarios = useQuery({
    queryKey: ['usuarios', pagina, busqueda, rol, estado],
    queryFn: () =>
      listarUsuarios({
        page: pagina,
        page_size: TAMANO,
        q: busqueda.trim() || undefined,
        rol: rol || undefined,
        estado: estado || undefined,
      }),
    placeholderData: (anterior) => anterior,
  });

  const cerrar = () => {
    setModal(null);
    setObjetivo(null);
    setMotivo('');
    setError('');
  };

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-resumen'] });
    void invalidarMenu(queryClient);
  };

  const cambiar = useMutation({
    mutationFn: ({ id, rol: destino, motivo: texto }: { id: number; rol: Rol; motivo: string }) =>
      cambiarRolUsuario(id, { rol: destino, motivo: texto }),
    onSuccess: (usuario) => {
      refrescar();
      cerrar();
      toast.exito(`Rol de ${usuario.nombre} actualizado a ${ETIQUETAS_ROL[usuario.rol]}.`);
    },
    onError: (fallo) => {
      const campos = erroresDeCampo(fallo);
      setError(campos.rol?.[0] ?? campos.usuario?.[0] ?? campos.motivo?.[0] ?? mensajeDeError(fallo));
    },
  });

  const suspender = useMutation({
    mutationFn: ({ id, motivo: texto }: { id: number; motivo: string }) => suspenderUsuario(id, texto),
    onSuccess: (usuario) => {
      refrescar();
      cerrar();
      toast.exito(`${usuario.nombre} fue suspendido. Sus sesiones se cerraron.`);
    },
    onError: (fallo) => {
      const campos = erroresDeCampo(fallo);
      setError(campos.estado?.[0] ?? campos.motivo?.[0] ?? mensajeDeError(fallo));
    },
  });

  const reactivar = useMutation({
    mutationFn: (id: number) => reactivarUsuario(id),
    onSuccess: (usuario) => {
      refrescar();
      cerrar();
      toast.exito(`${usuario.nombre} puede iniciar sesión de nuevo.`);
    },
    onError: (fallo) => setError(mensajeDeError(fallo)),
  });

  const abrirRol = (usuario: UsuarioAdmin) => {
    setObjetivo(usuario);
    setNuevoRol(usuario.rol === 'comprador' ? 'vendedor' : 'comprador');
    setMotivo('');
    setError('');
    setModal('rol');
  };

  const abrirSuspender = (usuario: UsuarioAdmin) => {
    setObjetivo(usuario);
    setMotivo('');
    setError('');
    setModal('suspender');
  };

  const abrirReactivar = (usuario: UsuarioAdmin) => {
    setObjetivo(usuario);
    setError('');
    setModal('reactivar');
  };

  const enviarRol = () => {
    if (!objetivo) return;
    if (objetivo.rol === nuevoRol) {
      setError('Selecciona un rol distinto al actual.');
      return;
    }
    if (motivo.trim().length < 5) {
      setError('Indica un motivo de al menos 5 caracteres.');
      return;
    }
    cambiar.mutate({ id: objetivo.id, rol: nuevoRol, motivo: motivo.trim() });
  };

  const enviarSuspension = () => {
    if (!objetivo) return;
    if (motivo.trim().length < 5) {
      setError('Indica un motivo de al menos 5 caracteres.');
      return;
    }
    suspender.mutate({ id: objetivo.id, motivo: motivo.trim() });
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Cambia roles, suspende cuentas y revisa sus pedidos y puestos. Toda decisión queda auditada."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-64 pl-9"
            placeholder="Nombre, correo o celular"
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value);
              setPagina(1);
            }}
            aria-label="Buscar usuario"
          />
        </div>
        <select
          className="input w-auto"
          value={rol}
          onChange={(evento) => {
            setRol(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          <option value="comprador">Compradores</option>
          <option value="vendedor">Vendedores</option>
          <option value="administrador">Administradores</option>
        </select>
        <select
          className="input w-auto"
          value={estado}
          onChange={(evento) => {
            setEstado(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
        </select>
      </div>

      {usuarios.isLoading && <CargandoBloque mensaje="Cargando usuarios…" />}
      {usuarios.isError && <EstadoError mensaje="No pudimos cargar los usuarios." onReintentar={() => void usuarios.refetch()} />}
      {usuarios.data && usuarios.data.results.length === 0 && (
        <EstadoVacio titulo="Sin usuarios" descripcion="No hay cuentas que coincidan con los filtros." icono={<Users className="h-9 w-9" />} />
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
                  <th className="p-3 text-right">Acciones</th>
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
                      {usuario.rol === 'vendedor' && usuario.estado_verificacion && (
                        <p className="mt-1 text-xs text-slate-500">{ETIQUETAS_VERIFICACION[usuario.estado_verificacion] ?? usuario.estado_verificacion}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`badge ${usuario.estado === 'activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                        {usuario.estado}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {usuario.pedidos_como_comprador} como comprador
                      {usuario.pedidos_activos > 0 && <span className="ml-1 font-semibold text-amber-700 dark:text-amber-300">({usuario.pedidos_activos} activos)</span>}
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
                    <td className="p-3">
                      <AccionesUsuario usuario={usuario} onRol={abrirRol} onSuspender={abrirSuspender} onReactivar={abrirReactivar} />
                    </td>
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
                  <span className={`badge ${usuario.estado === 'activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {usuario.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol} · {usuario.pedidos_como_comprador} pedidos
                  {usuario.pedidos_activos > 0 && ` · ${usuario.pedidos_activos} activos`}
                </p>
                <AccionesUsuario usuario={usuario} onRol={abrirRol} onSuspender={abrirSuspender} onReactivar={abrirReactivar} />
              </article>
            ))}
          </div>

          <Paginacion pagina={pagina} total={usuarios.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={usuarios.isFetching} />
        </>
      )}

      <Modal abierto={modal === 'rol'} onCerrar={cerrar} titulo={`Cambiar rol de ${objetivo?.nombre ?? ''}`}>
        <Campo etiqueta="Nuevo rol" htmlFor="nuevo-rol">
          <select id="nuevo-rol" className="input" value={nuevoRol} onChange={(evento) => setNuevoRol(evento.target.value as Rol)}>
            {ROLES.filter((opcion) => opcion !== objetivo?.rol).map((opcion) => (
              <option key={opcion} value={opcion}>{ETIQUETAS_ROL[opcion]}</option>
            ))}
          </select>
        </Campo>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {advertenciaRol(nuevoRol)}
          {objetivo && objetivo.pedidos_activos > 0 && (
            <p className="mt-1 font-semibold">Esta cuenta tiene {objetivo.pedidos_activos} pedido(s) activo(s); el cambio podría rechazarse hasta resolverlos.</p>
          )}
        </div>
        <Campo etiqueta="Motivo (obligatorio)" htmlFor="motivo-rol" className="mt-3">
          <textarea id="motivo-rol" rows={3} className="input" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Explica por qué cambias el rol (mínimo 5 caracteres)." />
        </Campo>
        <ErrorCampo mensaje={error} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={cerrar} disabled={cambiar.isPending}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={enviarRol} disabled={cambiar.isPending}>
            {cambiar.isPending ? 'Guardando…' : 'Cambiar rol'}
          </button>
        </div>
      </Modal>

      <Modal abierto={modal === 'suspender'} onCerrar={cerrar} titulo={`Suspender a ${objetivo?.nombre ?? ''}`}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          La cuenta no podrá iniciar sesión, se cerrarán sus sesiones y sus puestos activos pasarán a suspendidos. No se borra su historial.
        </p>
        <Campo etiqueta="Motivo (obligatorio)" htmlFor="motivo-suspender" className="mt-3">
          <textarea id="motivo-suspender" rows={3} className="input" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Explica el motivo de la suspensión (mínimo 5 caracteres)." />
        </Campo>
        <ErrorCampo mensaje={error} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={cerrar} disabled={suspender.isPending}>Cancelar</button>
          <button type="button" className="btn-danger" onClick={enviarSuspension} disabled={suspender.isPending}>
            {suspender.isPending ? 'Suspendiendo…' : 'Suspender cuenta'}
          </button>
        </div>
      </Modal>

      <ConfirmarModal
        abierto={modal === 'reactivar'}
        titulo={`¿Reactivar a ${objetivo?.nombre ?? ''}?`}
        descripcion="La cuenta podrá iniciar sesión de nuevo. Sus puestos no se reactivan automáticamente: gestiónalos desde Puestos."
        textoConfirmar="Reactivar"
        peligro={false}
        cargando={reactivar.isPending}
        onConfirmar={() => objetivo && reactivar.mutate(objetivo.id)}
        onCerrar={cerrar}
      />
    </div>
  );
}

function AccionesUsuario({
  usuario,
  onRol,
  onSuspender,
  onReactivar,
}: {
  usuario: UsuarioAdmin;
  onRol: (usuario: UsuarioAdmin) => void;
  onSuspender: (usuario: UsuarioAdmin) => void;
  onReactivar: (usuario: UsuarioAdmin) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {usuario.acciones_permitidas.includes('cambiar-rol') && (
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => onRol(usuario)}>
          <BadgeCheck className="h-3.5 w-3.5" /> Cambiar rol
        </button>
      )}
      {usuario.acciones_permitidas.includes('suspender') && (
        <button type="button" className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400" onClick={() => onSuspender(usuario)}>
          <ShieldOff className="h-3.5 w-3.5" /> Banear
        </button>
      )}
      {usuario.acciones_permitidas.includes('reactivar') && (
        <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => onReactivar(usuario)}>
          <ShieldCheck className="h-3.5 w-3.5" /> Reactivar
        </button>
      )}
      {usuario.acciones_permitidas.length === 0 && <span className="text-xs text-slate-400">Sin acciones</span>}
    </div>
  );
}
