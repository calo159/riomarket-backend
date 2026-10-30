import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';

export function SinPermiso() {
  const { rol } = useSession();
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rojo-100 text-rojo-700 dark:bg-rojo-950 dark:text-rojo-300">
        <ShieldX className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-2xl font-bold">No tienes permiso para entrar aquí</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Tu cuenta no tiene acceso a esta sección. Si crees que es un error, contacta al administrador.
      </p>
      <Link to={inicioPorRol(rol)} className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
