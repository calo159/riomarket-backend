import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/mini';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  ShoppingBasket,
  Store,
} from 'lucide-react';
import { useSession } from '../../auth/SessionProvider';
import { inicioPorRol } from '../../auth/permisos';
import { erroresDeCampo } from '../../lib/errors';
import { leerAvisoSesion } from '../../auth/tokens';
import { rutaInternaSegura } from '../../lib/utils';
import { CargandoPantalla } from '../../components/ui/Estado';
import { Campo } from '../../components/ui/Campos';
import { Logo } from '../../components/layout/Logo';

// zod/mini (en lugar de zod clásico) para no cargar en el bundle los métodos que no se usan.
const esquema = z.object({
  correo: z.pipe(
    z.string().check(z.trim(), z.minLength(1, 'Escribe tu correo.')),
    z.email('Escribe un correo válido.'),
  ),
  password: z.string().check(z.minLength(1, 'Escribe tu contraseña.')),
});

type Formulario = z.infer<typeof esquema>;

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_PASSWORD = 'RioMarket2026!';

const CUENTAS_DEMO = [
  { rol: 'Comprador', correo: 'luis@riomarket.test', icono: ShoppingBasket },
  { rol: 'Vendedor', correo: 'carmen@riomarket.test', icono: Store },
  { rol: 'Admin', correo: 'admin@riomarket.test', icono: ShieldCheck },
];

export function Login() {
  const { estado, rol, iniciarSesion } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [verPassword, setVerPassword] = useState(false);
  const [aviso] = useState(() => leerAvisoSesion());
  const expirada = params.get('expirada') === '1';
  const destino = rutaInternaSegura(params.get('redirect'));

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { correo: '', password: '' },
  });

  useEffect(() => {
    document.title = 'Ingresar · RioMarket';
  }, []);

  if (estado === 'cargando') return <CargandoPantalla mensaje="Comprobando tu sesión…" />;
  if (estado === 'autenticado') {
    return <Navigate to={destino ?? inicioPorRol(rol)} replace />;
  }

  const enviar = async (datos: Formulario) => {
    try {
      const usuario = await iniciarSesion(datos);
      navigate(destino ?? inicioPorRol(usuario.rol), { replace: true });
    } catch (error) {
      const campos = erroresDeCampo(error);
      if (campos.correo?.length) setError('correo', { message: campos.correo[0] });
      if (campos.password?.length) setError('password', { message: campos.password[0] });
      setError('root', {
        message:
          campos.__general?.[0] ??
          (campos.correo || campos.password
            ? 'Revisa los datos e intenta de nuevo.'
            : 'Correo o contraseña incorrectos.'),
      });
    }
  };

  const rellenarDemo = (correo: string) => {
    setValue('correo', correo, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    clearErrors();
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sand-400/20 blur-3xl" />
        <div className="relative">
          <Logo className="[&_span:last-child]:text-white" />
          <h1 className="mt-16 max-w-md text-4xl font-extrabold leading-tight">
            Tu mercado local, a un clic de distancia.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Compra frutas frescas, comidas y artesanías directo a los vendedores de Riohacha.
          </p>
        </div>
        <div className="relative grid gap-3">
          {[
            'Puestos verificados y reseñas reales',
            'Pago simulado seguro para tus prácticas',
            'Sigue tu pedido en tiempo real',
          ].map((texto) => (
            <div key={texto} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              <ShoppingBasket className="h-5 w-5 text-sand-300" />
              <span className="text-sm">{texto}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-3xl font-bold">Bienvenido de nuevo</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ingresa para comprar o administrar tu puesto.
          </p>

          {(aviso || expirada) && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{aviso ?? 'Tu sesión expiró. Inicia sesión de nuevo.'}</p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(enviar)} noValidate>
            {errors.root?.message && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{errors.root.message}</p>
              </div>
            )}
            <Campo etiqueta="Correo electrónico" htmlFor="correo" error={errors.correo?.message}>
              <input
                id="correo"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="tu@correo.com"
                {...register('correo')}
              />
            </Campo>
            <Campo etiqueta="Contraseña" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-11"
                  placeholder="Tu contraseña"
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

            <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="link">
              Crea una gratis
            </Link>
          </p>

          {DEMO_MODE && (
            <div className="mt-8 rounded-xl border border-dashed p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Acceso rápido de demostración
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {CUENTAS_DEMO.map(({ rol, correo, icono: Icono }) => (
                  <button
                    key={correo}
                    type="button"
                    className="btn-secondary justify-center px-2 py-2 text-xs"
                    onClick={() => rellenarDemo(correo)}
                    title={`Usar la cuenta de ${rol.toLowerCase()}`}
                  >
                    <Icono className="h-3.5 w-3.5" /> {rol}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Contraseña de todas las cuentas: <span className="font-mono">{DEMO_PASSWORD}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
