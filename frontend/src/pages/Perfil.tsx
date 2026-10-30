import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, LogOut, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { actualizarPerfil, obtenerPerfil } from '../api/auth';
import { useSession } from '../auth/SessionProvider';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../components/ui/Estado';
import { Campo, ErrorCampo } from '../components/ui/Campos';
import { useToast } from '../components/ui/Toast';
import { formatearFecha, ETIQUETAS_ROL } from '../lib/format';
import { erroresDeCampo, mensajeDeError } from '../lib/errors';
import { iniciales } from '../lib/utils';
import { claves } from '../lib/queryKeys';

export function Perfil() {
  const { recargarPerfil, cerrarSesion } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    document.title = 'Mi perfil · RioMarket';
  }, []);

  const perfil = useQuery({ queryKey: claves.perfil, queryFn: obtenerPerfil });

  useEffect(() => {
    if (perfil.data && !inicializado) {
      setNombre(perfil.data.nombre);
      setCorreo(perfil.data.correo);
      setCelular(perfil.data.celular);
      setInicializado(true);
    }
  }, [perfil.data, inicializado]);

  const guardar = useMutation({
    mutationFn: () => actualizarPerfil({ nombre: nombre.trim(), correo: correo.trim(), celular: celular.trim() }),
    onSuccess: (datos) => {
      setNombre(datos.nombre);
      setCorreo(datos.correo);
      setCelular(datos.celular);
      setErrores({});
      void queryClient.invalidateQueries({ queryKey: claves.perfil });
      void recargarPerfil();
      toast.exito('Perfil actualizado.');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) nuevos[campo] = mensajes[0];
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos actualizar tu perfil.'));
    },
  });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};
    if (nombre.trim().length < 2) nuevos.nombre = 'Escribe tu nombre completo.';
    if (!correo.includes('@')) nuevos.correo = 'Escribe un correo válido.';
    if (celular.replace(/\D/g, '').length < 7) nuevos.celular = 'Escribe un celular válido.';
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    guardar.mutate();
  };

  if (perfil.isLoading) return <div className="mx-auto max-w-3xl px-4 py-10"><CargandoBloque mensaje="Cargando perfil…" /></div>;
  if (perfil.isError || !perfil.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EstadoError mensaje="No pudimos cargar tu perfil." onReintentar={() => void perfil.refetch()} />
      </div>
    );
  }

  const datos = perfil.data;
  const esVendedor = datos.rol === 'vendedor';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <EncabezadoPagina titulo="Mi perfil" descripcion="Gestiona tus datos de contacto y revisa el estado de tu cuenta." />

      <section className="card mb-6 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
          {iniciales(datos.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">{datos.nombre}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{datos.correo}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {ETIQUETAS_ROL[datos.rol] ?? datos.rol}
            </span>
            {datos.estado === 'activo' ? (
              <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <BadgeCheck className="mr-1 h-3 w-3" /> Cuenta activa
              </span>
            ) : (
              <span className="badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Suspendida</span>
            )}
            {esVendedor && datos.estado_verificacion && (
              <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <ShieldCheck className="mr-1 h-3 w-3" /> Verificación: {datos.estado_verificacion}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void cerrarSesion()}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </section>

      <form className="card p-5" onSubmit={enviar} noValidate>
        <h2 className="text-lg font-bold">Datos de contacto</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Estos datos se usan para coordinar tus entregas y notificaciones.
        </p>
        <div className="mt-4 space-y-3">
          <Campo etiqueta="Nombre completo" htmlFor="nombre" error={errores.nombre}>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input id="nombre" className="input pl-9" value={nombre} onChange={(evento) => setNombre(evento.target.value)} autoComplete="name" />
            </div>
          </Campo>
          <Campo etiqueta="Correo" htmlFor="correo" error={errores.correo}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input id="correo" type="email" className="input pl-9" value={correo} onChange={(evento) => setCorreo(evento.target.value)} autoComplete="email" />
            </div>
          </Campo>
          <Campo etiqueta="Celular" htmlFor="celular" error={errores.celular}>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input id="celular" type="tel" className="input pl-9" value={celular} onChange={(evento) => setCelular(evento.target.value)} autoComplete="tel" />
            </div>
          </Campo>
          <ErrorCampo mensaje={errores.__general} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Miembro desde {formatearFecha(datos.fecha_registro)}. El rol y el estado de la cuenta no se pueden editar.
          </p>
          <button type="submit" className="btn-primary" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {esVendedor && (
        <section className="card mt-5 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5" /> Verificación de vendedor</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consulta o actualiza tus documentos para poder publicar puestos y productos.
          </p>
          <Link to="/vendedor/verificacion" className="btn-secondary mt-3">Ir a mi verificación</Link>
        </section>
      )}
    </div>
  );
}
