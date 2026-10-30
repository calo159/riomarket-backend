import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';

export function SinPermiso() {
  const { rol } = useSession();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Tu cuenta no puede entrar aquí</h1>
      <p className="mt-3 text-lg text-slate-700 dark:text-slate-300">
        Esta sección es para otro tipo de cuenta. Si crees que es un error, escribe a soporte@riomarket.test.
      </p>
      <Link to={inicioPorRol(rol)} className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
