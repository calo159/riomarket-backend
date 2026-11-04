import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { editarDatosUsuario, restablecerContrasenaUsuario, type UsuarioAdmin } from '../../api/admin';
import { ContrasenaTemporal } from '../../components/admin/ContrasenaTemporal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { ETIQUETAS_ROL } from '../../lib/format';

const MOTIVO_MIN = 5;

/**
 * Corregir los datos de una cuenta (nombre, correo, celular) o restablecerle la contraseña. Ambas
 * acciones piden un motivo y quedan en la auditoría; la contraseña nueva se muestra una sola vez.
 */
export function EditarCuenta({
  usuario,
  onCerrar,
  onCambio,
}: {
  usuario: UsuarioAdmin;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const toast = useToast();
  const puede = (accion: string) => usuario.acciones_permitidas.includes(accion as never);

  const [datos, setDatos] = useState({ nombre: usuario.nombre, correo: usuario.correo, celular: usuario.celular });
  const [motivoDatos, setMotivoDatos] = useState('');
  const [erroresDatos, setErroresDatos] = useState<Record<string, string[]>>({});
  const [errorDatos, setErrorDatos] = useState('');

  const [motivoClave, setMotivoClave] = useState('');
  const [errorClave, setErrorClave] = useState('');
  const [nueva, setNueva] = useState<string | null>(null);

  const guardarDatos = useMutation({
    mutationFn: () =>
      editarDatosUsuario(usuario.id, {
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim(),
        celular: datos.celular.trim(),
        motivo: motivoDatos.trim(),
      }),
    onSuccess: (u) => {
      onCambio();
      setMotivoDatos('');
      setErroresDatos({});
      setErrorDatos('');
      toast.exito(`Datos de ${u.nombre} actualizados.`);
    },
    onError: (fallo) => {
      setErroresDatos(erroresDeCampo(fallo));
      setErrorDatos(mensajeDeError(fallo, 'No pudimos guardar los datos.'));
    },
  });

  const restablecer = useMutation({
    mutationFn: () => restablecerContrasenaUsuario(usuario.id, motivoClave.trim()),
    onSuccess: (u) => {
      onCambio();
      setMotivoClave('');
      setErrorClave('');
      setNueva(u.password_temporal);
      toast.exito(`Restablecimos la contraseña de ${u.nombre}. Sus sesiones se cerraron.`);
    },
    onError: (fallo) => setErrorClave(mensajeDeError(fallo, 'No pudimos restablecer la contraseña.')),
  });

  const motivoValido = (texto: string, fijarError: (mensaje: string) => void) => {
    if (texto.trim().length < MOTIVO_MIN) {
      fijarError('Indica un motivo de al menos 5 caracteres.');
      return false;
    }
    fijarError('');
    return true;
  };

  const hayErrorDeCampo = Object.keys(erroresDatos).some((campo) => campo !== '__general');
  const cambiar = (campo: keyof typeof datos, valor: string) => setDatos((actual) => ({ ...actual, [campo]: valor }));

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Editar cuenta de ${usuario.nombre}`} ancho="max-w-xl">
      <p className="mb-4 text-xs text-slate-500">
        {usuario.correo} · {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol} · {usuario.estado}
      </p>

      {puede('editar-datos') && (
        <section className="mb-5 space-y-3" aria-labelledby="sec-datos">
          <h3 id="sec-datos" className="text-sm font-semibold">1. Datos de la cuenta</h3>
          <Campo etiqueta="Nombre completo" htmlFor="editar-nombre" error={erroresDatos.nombre?.[0]}>
            <input id="editar-nombre" className="input" value={datos.nombre} maxLength={120} onChange={(e) => cambiar('nombre', e.target.value)} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Correo" htmlFor="editar-correo" error={erroresDatos.correo?.[0]}>
              <input id="editar-correo" type="email" className="input" value={datos.correo} onChange={(e) => cambiar('correo', e.target.value)} />
            </Campo>
            <Campo etiqueta="Celular" htmlFor="editar-celular" error={erroresDatos.celular?.[0]}>
              <input id="editar-celular" type="tel" className="input" value={datos.celular} maxLength={20} onChange={(e) => cambiar('celular', e.target.value)} />
            </Campo>
          </div>
          <Campo etiqueta="Motivo del cambio (obligatorio)" htmlFor="editar-motivo" error={erroresDatos.motivo?.[0]}>
            <textarea id="editar-motivo" rows={2} className="input" value={motivoDatos} onChange={(e) => setMotivoDatos(e.target.value)} />
          </Campo>
          {!hayErrorDeCampo && <ErrorCampo mensaje={errorDatos} />}
          <button
            type="button"
            className="btn-primary"
            disabled={guardarDatos.isPending}
            onClick={() => motivoValido(motivoDatos, setErrorDatos) && guardarDatos.mutate()}
          >
            {guardarDatos.isPending ? 'Guardando…' : 'Guardar datos'}
          </button>
        </section>
      )}

      {puede('restablecer-contrasena') && (
        <section className="space-y-3 border-t pt-4" aria-labelledby="sec-clave">
          <h3 id="sec-clave" className="text-sm font-semibold">2. Restablecer contraseña</h3>
          {nueva ? (
            <ContrasenaTemporal valor={nueva} id="password-restablecida" />
          ) : (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Pone una contraseña temporal nueva y cierra sus sesiones abiertas. Úsalo cuando alguien olvidó la suya: te la mostramos
                una sola vez para que se la des.
              </p>
              <Campo etiqueta="Motivo (obligatorio)" htmlFor="motivo-clave">
                <textarea id="motivo-clave" rows={2} className="input" value={motivoClave} onChange={(e) => setMotivoClave(e.target.value)} />
              </Campo>
              <ErrorCampo mensaje={errorClave} />
              <button
                type="button"
                className="btn-secondary"
                disabled={restablecer.isPending}
                onClick={() => motivoValido(motivoClave, setErrorClave) && restablecer.mutate()}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" /> {restablecer.isPending ? 'Restableciendo…' : 'Restablecer contraseña'}
              </button>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
