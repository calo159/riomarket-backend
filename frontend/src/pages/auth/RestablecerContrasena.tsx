import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/mini';
import { AlertCircle } from 'lucide-react';
import { restablecerContrasena } from '../../api/auth';
import { AYUDA_CONTRASENA, contrasenaNueva } from '../../lib/contrasena';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { Campo } from '../../components/ui/Campos';
import { CampoContrasena } from '../../components/ui/CampoContrasena';
import { TarjetaAuth } from './TarjetaAuth';

const esquema = z
  .object({
    codigo: z.string().check(z.trim()),
    nueva: contrasenaNueva,
    confirmar: z.string().check(z.minLength(1, 'Repite tu contraseña.')),
  })
  .check(
    z.refine((datos) => datos.nueva === datos.confirmar, {
      path: ['confirmar'],
      message: 'Las contraseñas no coinciden.',
    }),
  );

type Formulario = z.infer<typeof esquema>;

export function RestablecerContrasena() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenDelEnlace = params.get('token')?.trim() ?? '';
  const [enlaceVencido, setEnlaceVencido] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: '', nueva: '', confirmar: '' },
  });

  useEffect(() => {
    document.title = 'Nueva contraseña · RioMarket';
  }, []);

  const enviar = async (datos: Formulario) => {
    const token = tokenDelEnlace || datos.codigo;
    if (!token) {
      setError('codigo', { message: 'Pega el código que te enviamos por correo.' });
      return;
    }
    setEnlaceVencido(false);
    try {
      await restablecerContrasena({ token, nueva: datos.nueva });
      navigate('/login?restablecida=1', { replace: true });
    } catch (error) {
      const campos = erroresDeCampo(error);
      // Las reglas de contraseña de Django llegan como errores generales (non_field_errors).
      const reglaDeContrasena = campos.nueva?.[0] ?? campos.non_field_errors?.[0];
      if (campos.token?.length) {
        setEnlaceVencido(true);
        setError('root', { message: 'El enlace ya no sirve: venció o ya se usó. Pide uno nuevo.' });
      } else if (reglaDeContrasena) {
        setError('nueva', { message: reglaDeContrasena });
      } else {
        setError('root', { message: mensajeDeError(error, 'No pudimos cambiar la contraseña. Intenta de nuevo.') });
      }
    }
  };

  return (
    <TarjetaAuth titulo="Elige una contraseña nueva" descripcion="Al cambiarla, cerramos tus sesiones abiertas en otros dispositivos.">
      <form className="space-y-4" onSubmit={handleSubmit(enviar)} noValidate>
        {errors.root?.message && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200" role="alert">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errors.root.message}</span>
            </p>
            {enlaceVencido && (
              <Link to="/olvide-contrasena" className="link mt-2 inline-block font-semibold">
                Pedir un enlace nuevo
              </Link>
            )}
          </div>
        )}
        {!tokenDelEnlace && (
          <Campo etiqueta="Código del correo" htmlFor="codigo" error={errors.codigo?.message} ayuda="Está en el correo que te enviamos.">
            <input id="codigo" autoComplete="one-time-code" className="input font-mono" {...register('codigo')} />
          </Campo>
        )}
        <CampoContrasena
          id="nueva"
          etiqueta="Contraseña nueva"
          autoComplete="new-password"
          error={errors.nueva?.message}
          ayuda={AYUDA_CONTRASENA}
          {...register('nueva')}
        />
        <CampoContrasena
          id="confirmar"
          etiqueta="Repite la contraseña"
          autoComplete="new-password"
          error={errors.confirmar?.message}
          {...register('confirmar')}
        />
        <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </TarjetaAuth>
  );
}
