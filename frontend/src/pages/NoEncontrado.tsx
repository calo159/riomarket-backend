import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';

export function NoEncontrado() {
  const { rol } = useSession();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Esta página no existe</h1>
      <p className="mt-3 text-lg text-slate-700 dark:text-slate-300">
        El enlace está mal escrito o el contenido ya no está. Vuelve al inicio o busca en el catálogo.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to={inicioPorRol(rol)} className="btn-primary">Ir al inicio</Link>
        <Link to="/catalogo" className="btn-secondary">Buscar en el catálogo</Link>
      </div>
    </div>
  );
}
