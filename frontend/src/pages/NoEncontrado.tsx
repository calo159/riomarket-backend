import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';

export function NoEncontrado() {
  const { rol } = useSession();
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Compass className="h-8 w-8" />
      </span>
      <p className="mt-4 text-sm font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Error 404</p>
      <h1 className="mt-1 text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Puede que el enlace esté mal escrito o que el contenido ya no exista.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={inicioPorRol(rol)} className="btn-primary">Ir al inicio</Link>
        <Link to="/catalogo" className="btn-secondary">Explorar catálogo</Link>
      </div>
    </div>
  );
}
