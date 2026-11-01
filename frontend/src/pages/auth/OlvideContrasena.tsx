import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/mini';
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { solicitarRecuperacion } from '../../api/auth';
import { mensajeDeError } from '../../lib/errors';
import { Campo } from '../../components/ui/Campos';
import { TarjetaAuth } from './TarjetaAuth';

const esquema = z.object({
  correo: z.pipe(
    z.string().check(z.trim(), z.minLength(1, 'Escribe tu correo.')),
    z.email('Escribe un correo válido.'),
  ),
});

type Formulario = z.infer<typeof esquema>;

export function OlvideContrasena() {
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { correo: '' } });

  useEffect(() => {
    document.title = 'Recuperar contraseña · RioMarket';
  }, []);

  const enviar = async ({ correo }: Formulario) => {
    try {
      await solicitarRecuperacion(correo);
      setEnviadoA(correo);
    } catch (error) {
      setError('root', { message: mensajeDeError(error, 'No pudimos enviar el correo. Intenta de nuevo.') });
    }
  };

  if (enviadoA) {
    return (
      <TarjetaAuth titulo="Revisa tu correo">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" role="status">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Si <strong className="break-all">{enviadoA}</strong> tiene una cuenta, te enviamos un enlace para elegir una
            contraseña nueva. Vale 1 hora.
          </p>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          ¿No llega? Mira en spam o correo no deseado y espera unos minutos antes de pedirlo de nuevo.
        </p>
        <div className="mt-6 grid gap-3">
          <Link to="/restablecer-contrasena" className="btn-secondary justify-center">
            Ya tengo el código
          </Link>
          <Link to="/login" className="link inline-flex items-center justify-center gap-1 text-sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a ingresar
          </Link>
        </div>
      </TarjetaAuth>
    );
  }

  return (
    <TarjetaAuth titulo="¿Olvidaste tu contraseña?" descripcion="Escribe el correo de tu cuenta y te enviamos un enlace para elegir una nueva.">
      <form className="space-y-4" onSubmit={handleSubmit(enviar)} noValidate>
        {errors.root?.message && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{errors.root.message}</p>
          </div>
        )}
        <Campo etiqueta="Correo electrónico" htmlFor="correo" error={errors.correo?.message}>
          <input id="correo" type="email" autoComplete="email" className="input" placeholder="tu@correo.com" {...register('correo')} />
        </Campo>
        <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviarme el enlace'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="link inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a ingresar
        </Link>
      </p>
    </TarjetaAuth>
  );
}
