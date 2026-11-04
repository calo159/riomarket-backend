import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crearUsuario, type UsuarioCreado } from '../../api/admin';
import { ContrasenaTemporal } from '../../components/admin/ContrasenaTemporal';
import { Campo, ErrorCampo } from '../../components/ui/Campos';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { erroresDeCampo, mensajeDeError } from '../../lib/errors';
import { ETIQUETAS_ROL } from '../../lib/format';
import type { Rol } from '../../lib/types';

const ROLES: Rol[] = ['comprador', 'vendedor', 'administrador'];

const AYUDA_ROL: Record<Rol, string> = {
  comprador: 'Compra en el catálogo y gestiona sus pedidos.',
  vendedor: 'Queda pendiente de verificación: no podrá publicar hasta que apruebes su cédula.',
  administrador: 'Tendrá acceso total a la administración. Úsalo solo con personas de confianza.',
};

const VACIO = { nombre: '', correo: '', celular: '', rol: 'comprador' as Rol };

/**
 * Crear una cuenta con un botón. El sistema genera una contraseña temporal y se muestra una sola
 * vez: el administrador se la entrega a la persona, que la cambia al entrar desde «Mi perfil».
 */
export function NuevoUsuario({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const toast = useToast();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [creado, setCreado] = useState<UsuarioCreado | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setDatos(VACIO);
    setErrores({});
    setError('');
    setCreado(null);
  }, [abierto]);

  const cambiar = (campo: keyof typeof VACIO, valor: string) => setDatos((actual) => ({ ...actual, [campo]: valor }));

  const crear = useMutation({
    mutationFn: () =>
      crearUsuario({
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim(),
        celular: datos.celular.trim(),
        rol: datos.rol,
      }),
    onSuccess: (usuario) => {
      setCreado(usuario);
      onCreado();
      toast.exito(`Cuenta creada para ${usuario.nombre}.`);
    },
    onError: (fallo) => {
      setErrores(erroresDeCampo(fallo));
      setError(mensajeDeError(fallo, 'No pudimos crear la cuenta.'));
    },
  });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!datos.nombre.trim() || !datos.correo.trim() || !datos.celular.trim()) {
      setError('Escribe el nombre, el correo y el celular.');
      return;
    }
    setErrores({});
    setError('');
    crear.mutate();
  };

  const hayErrorDeCampo = Object.keys(errores).some((campo) => campo !== '__general');

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={creado ? 'Cuenta creada' : 'Nuevo usuario'}>
      {creado ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ya puede entrar <strong>{creado.nombre}</strong> con este correo y esta contraseña temporal.
          </p>
          <dl className="text-sm">
            <dt className="label">Correo</dt>
            <dd className="font-medium">{creado.correo}</dd>
          </dl>
          <ContrasenaTemporal valor={creado.password_temporal} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCreado(null);
                setDatos(VACIO);
              }}
            >
              Crear otra
            </button>
            <button type="button" className="btn-primary" onClick={onCerrar}>
              Listo
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Escribe los datos de la persona. La contraseña la genera el sistema y te la mostramos al terminar.
          </p>
          <Campo etiqueta="Nombre completo" htmlFor="nuevo-nombre" error={errores.nombre?.[0]}>
            <input
              id="nuevo-nombre"
              className="input"
              value={datos.nombre}
              maxLength={120}
              autoComplete="off"
              onChange={(evento) => cambiar('nombre', evento.target.value)}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Correo" htmlFor="nuevo-correo" error={errores.correo?.[0]}>
              <input
                id="nuevo-correo"
                type="email"
                className="input"
                value={datos.correo}
                autoComplete="off"
                onChange={(evento) => cambiar('correo', evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="Celular" htmlFor="nuevo-celular" error={errores.celular?.[0]}>
              <input
                id="nuevo-celular"
                type="tel"
                className="input"
                value={datos.celular}
                maxLength={20}
                autoComplete="off"
                onChange={(evento) => cambiar('celular', evento.target.value)}
              />
            </Campo>
          </div>
          <Campo etiqueta="Rol" htmlFor="nuevo-rol" error={errores.rol?.[0]} ayuda={AYUDA_ROL[datos.rol]}>
            <select id="nuevo-rol" className="input" value={datos.rol} onChange={(evento) => cambiar('rol', evento.target.value)}>
              {ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {ETIQUETAS_ROL[rol]}
                </option>
              ))}
            </select>
          </Campo>
          {!hayErrorDeCampo && <ErrorCampo mensaje={error} />}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onCerrar} disabled={crear.isPending}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
