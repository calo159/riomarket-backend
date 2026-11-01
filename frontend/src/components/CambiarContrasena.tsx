import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/mini';
import { KeyRound } from 'lucide-react';
import { cambiarContrasena } from '../api/auth';
import { useSession } from '../auth/SessionProvider';
import { AYUDA_CONTRASENA, contrasenaNueva } from '../lib/contrasena';
import { erroresDeCampo, mensajeDeError } from '../lib/errors';
import { CampoContrasena } from './ui/CampoContrasena';
import { ErrorCampo } from './ui/Campos';

const esquema = z
  .object({
    actual: z.string().check(z.minLength(1, 'Escribe tu contraseña actual.')),
    nueva: contrasenaNueva,
    confirmar: z.string().check(z.minLength(1, 'Repite la contraseña nueva.')),
  })
  .check(
    z.refine((datos) => datos.nueva === datos.confirmar, {
      path: ['confirmar'],
      message: 'Las contraseñas no coinciden.',
    }),
  );

type Formulario = z.infer<typeof esquema>;

/**
 * Cambio de contraseña desde el perfil. El servidor cierra todas las sesiones al cambiarla,
 * así que esta también se cierra y se vuelve al login con un aviso.
 */
export function CambiarContrasena() {
  const { cerrarSesion } = useSession();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { actual: '', nueva: '', confirmar: '' } });

  const enviar = async (datos: Formulario) => {
    try {
      await cambiarContrasena({ actual: datos.actual, nueva: datos.nueva });
    } catch (error) {
      const campos = erroresDeCampo(error);
      if (campos.actual?.length) setError('actual', { message: campos.actual[0] });
      // Las reglas de contraseña de Django llegan como errores generales (non_field_errors).
      else if (campos.nueva?.length || campos.non_field_errors?.length) setError('nueva', { message: (campos.nueva ?? campos.non_field_errors)[0] });
      else setError('root', { message: mensajeDeError(error, 'No pudimos cambiar la contraseña. Intenta de nuevo.') });
      return;
    }
    await cerrarSesion();
    navigate('/login?restablecida=1', { replace: true });
  };

  return (
    <form className="card mt-5 p-5" onSubmit={handleSubmit(enviar)} noValidate aria-labelledby="titulo-contrasena">
      <h2 id="titulo-contrasena" className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="h-5 w-5" aria-hidden="true" /> Cambiar contraseña
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Al cambiarla cerramos tus sesiones y tendrás que ingresar de nuevo.
      </p>
      <div className="mt-4 space-y-3">
        <CampoContrasena id="actual" etiqueta="Contraseña actual" autoComplete="current-password" error={errors.actual?.message} {...register('actual')} />
        <CampoContrasena id="nueva" etiqueta="Contraseña nueva" autoComplete="new-password" error={errors.nueva?.message} ayuda={AYUDA_CONTRASENA} {...register('nueva')} />
        <CampoContrasena id="confirmar" etiqueta="Repite la contraseña nueva" autoComplete="new-password" error={errors.confirmar?.message} {...register('confirmar')} />
        <ErrorCampo mensaje={errors.root?.message} />
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  );
}
