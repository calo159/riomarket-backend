import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/mini';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
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
import { MarcaSvg } from '../../components/layout/MarcaSvg';
import { desvanecer, PatronOlas } from '../../components/ui/Decoracion';

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
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1240px] gap-0 px-3 py-5 sm:px-5 lg:grid-cols-2 lg:py-8">
      <div className="relative hidden overflow-hidden rounded-l-xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-12 text-white dark:from-brand-900 dark:via-brand-900 dark:to-brand-950 lg:flex lg:flex-col lg:justify-between">
        <PatronOlas className="text-white opacity-[.07]" style={desvanecer('to bottom left', 85)} />
        <MarcaSvg conFondo={false} className="pointer-events-none absolute -right-12 -top-10 h-80 w-80 opacity-[.13]" />
        <div className="relative">
          <Logo sobreMarca />
          <p className="mt-16 max-w-md text-4xl font-extrabold leading-[1.05] tracking-tight">
            Tu mercado local, a un clic de distancia.
          </p>
          <p className="mt-4 max-w-md text-lg text-brand-50">
            Compra frutas, comidas y artesanías directo a los vendedores de Riohacha.
          </p>
        </div>
        <div className="relative grid gap-3">
          {[
            'Puestos verificados y reseñas reales',
            'Efectivo o modo de prueba: aquí no hay pasarela real',
            'Sigue tu pedido paso a paso',
          ].map((texto) => (
            <div key={texto} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3">
              <ShoppingBasket className="h-5 w-5 text-amarillo" />
              <span className="text-sm">{texto}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-10 sm:px-8 lg:rounded-l-none lg:rounded-r-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ingresa para comprar o administrar tu puesto.
          </p>

          {(aviso || expirada) && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{aviso ?? 'Tu sesión expiró. Inicia sesión de nuevo.'}</p>
            </div>
          )}

          {params.get('restablecida') === '1' && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Cambiaste tu contraseña. Ingresa con la nueva.</p>
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

            <p className="-mt-1 text-right text-sm">
              <Link to="/olvide-contrasena" className="link">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>

            <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="link">
              Crea una cuenta
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
