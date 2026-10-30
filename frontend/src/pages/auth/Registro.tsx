import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/mini';
import { AlertCircle, ArrowRight, Eye, EyeOff, Store, ShoppingBag } from 'lucide-react';
import { registrarUsuario } from '../../api/auth';
import { useSession } from '../../auth/SessionProvider';
import { inicioPorRol } from '../../auth/permisos';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { useToast } from '../../components/ui/Toast';
import { Campo } from '../../components/ui/Campos';
import { CargandoPantalla } from '../../components/ui/Estado';
import { Logo } from '../../components/layout/Logo';
import { cn } from '../../lib/utils';

const esquema = z
  .object({
    nombre: z
      .string()
      .check(
        z.trim(),
        z.minLength(3, 'Escribe tu nombre completo.'),
        z.maxLength(120, 'El nombre es muy largo.'),
      ),
    correo: z.pipe(
      z.string().check(z.trim(), z.minLength(1, 'Escribe tu correo.')),
      z.email('Escribe un correo válido.'),
    ),
    celular: z
      .string()
      .check(
        z.trim(),
        z.minLength(7, 'Escribe un celular válido.'),
        z.maxLength(20, 'El celular es muy largo.'),
        z.regex(/^[0-9+\s()-]+$/, 'Usa solo números, espacios o el signo +.'),
      ),
    rol: z.enum(['comprador', 'vendedor']),
    password: z
      .string()
      .check(
        z.minLength(8, 'La contraseña debe tener al menos 8 caracteres.'),
        z.regex(/[A-Za-z]/, 'Incluye al menos una letra.'),
        z.regex(/[0-9]/, 'Incluye al menos un número.'),
      ),
    confirmar: z.string().check(z.minLength(1, 'Repite tu contraseña.')),
    acepta: z
      .boolean()
      .check(z.refine((valor) => valor, { message: 'Debes aceptar las condiciones para continuar.' })),
  })
  .check(
    z.refine((datos) => datos.password === datos.confirmar, {
      path: ['confirmar'],
      message: 'Las contraseñas no coinciden.',
    }),
  );

type Formulario = z.infer<typeof esquema>;

export function Registro() {
  const { estado, iniciarSesion } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [verPassword, setVerPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: '',
      correo: '',
      celular: '',
      rol: params.get('rol') === 'vendedor' ? 'vendedor' : 'comprador',
      password: '',
      confirmar: '',
      acepta: false,
    },
  });

  const rol = watch('rol');

  useEffect(() => {
    document.title = 'Crear cuenta · RioMarket';
  }, []);

  if (estado === 'cargando') return <CargandoPantalla mensaje="Comprobando tu sesión…" />;
  if (estado === 'autenticado') return <Navigate to="/" replace />;

  const enviar = async (datos: Formulario) => {
    try {
      await registrarUsuario({
        nombre: datos.nombre,
        correo: datos.correo,
        celular: datos.celular,
        rol: datos.rol,
        password: datos.password,
      });
      try {
        const usuario = await iniciarSesion({ correo: datos.correo, password: datos.password });
        toast.exito('¡Tu cuenta está lista! Bienvenido a RioMarket.');
        navigate(
          usuario.rol === 'vendedor' ? '/vendedor/verificacion' : inicioPorRol(usuario.rol),
          { replace: true },
        );
      } catch {
        toast.exito('Cuenta creada. Inicia sesión con tus credenciales.');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      const campos = erroresDeCampo(error);
      for (const clave of ['nombre', 'correo', 'celular', 'password', 'rol'] as const) {
        if (campos[clave]?.length) setError(clave, { message: campos[clave][0] });
      }
      setError('root', { message: mensajeDeError(error, 'No pudimos crear tu cuenta.') });
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1240px] gap-0 px-3 py-5 sm:px-5 lg:grid-cols-[1fr_1.1fr] lg:py-8">
      <div className="relative hidden overflow-hidden rounded-l-xl bg-brand-600 p-12 text-white dark:bg-brand-900 lg:flex lg:flex-col lg:justify-between">
        <div className="relative">
          <Logo sobreMarca />
          <h1 className="mt-16 max-w-md text-4xl font-extrabold leading-[1.05] tracking-tight">
            Únete a la comunidad que mueve a Riohacha.
          </h1>
          <p className="mt-4 max-w-md text-lg text-brand-50">
            Compra a tus vecinos o abre tu propio puesto y llega a más clientes.
          </p>
        </div>
        <div className="relative space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3">
            <ShoppingBag className="h-5 w-5 text-amarillo" /> Compra fácil y recibe donde estés.
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3">
            <Store className="h-5 w-5 text-amarillo" /> Vende con verificación de identidad.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-10 sm:px-8 lg:rounded-l-none lg:rounded-r-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="w-full max-w-lg">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Crea tu cuenta</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Toma menos de un minuto.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(enviar)} noValidate>
            {errors.root?.message && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{errors.root.message}</p>
              </div>
            )}

            <fieldset>
              <legend className="label">Quiero usar RioMarket para…</legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { valor: 'comprador' as const, titulo: 'Comprar', icono: ShoppingBag },
                  { valor: 'vendedor' as const, titulo: 'Vender', icono: Store },
                ].map(({ valor, titulo, icono: Icono }) => (
                  <label
                    key={valor}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition',
                      rol === valor
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
                        : 'hover:border-slate-300 dark:hover:border-slate-700',
                    )}
                  >
                    <input type="radio" value={valor} className="sr-only" {...register('rol')} />
                    <Icono className={cn('h-5 w-5', rol === valor ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400')} />
                    <span className="text-sm font-semibold">{titulo}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Campo etiqueta="Nombre completo" htmlFor="nombre" error={errors.nombre?.message}>
              <input id="nombre" className="input" autoComplete="name" placeholder="Ej. Carmen Uriana" {...register('nombre')} />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Correo" htmlFor="correo" error={errors.correo?.message}>
                <input id="correo" type="email" className="input" autoComplete="email" placeholder="tu@correo.com" {...register('correo')} />
              </Campo>
              <Campo etiqueta="Celular" htmlFor="celular" error={errors.celular?.message}>
                <input id="celular" type="tel" className="input" autoComplete="tel" placeholder="300 123 4567" {...register('celular')} />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Contraseña" htmlFor="password" error={errors.password?.message} ayuda="Mínimo 8 caracteres, con letras y números.">
                <div className="relative">
                  <input
                    id="password"
                    type={verPassword ? 'text' : 'password'}
                    className="input pr-11"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((valor) => !valor)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Campo>
              <Campo etiqueta="Repite la contraseña" htmlFor="confirmar" error={errors.confirmar?.message}>
                <input
                  id="confirmar"
                  type={verPassword ? 'text' : 'password'}
                  className="input"
                  autoComplete="new-password"
                  {...register('confirmar')}
                />
              </Campo>
            </div>

            {rol === 'vendedor' && (
              <p className="rounded-xl border border-dashed px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                Después de registrarte te pediremos tu cédula para verificar tu identidad. Solo los vendedores
                aprobados pueden publicar puestos.
              </p>
            )}

            <div>
              <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" {...register('acepta')} />
                <span>
                  Acepto las condiciones de uso y el tratamiento de mis datos personales para operar en RioMarket.
                </span>
              </label>
              {errors.acepta?.message && <p className="field-error">{errors.acepta.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="link">
              Ingresa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
