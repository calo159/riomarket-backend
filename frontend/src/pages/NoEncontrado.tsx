import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';
import { PuestoCerrado } from '../components/ui/Ilustraciones';

export function NoEncontrado() {
  const { rol } = useSession();
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <PuestoCerrado />
      <h1 className="mt-6 text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Este puesto ya cerró, o nunca existió (error 404). Puede que el enlace esté mal escrito o que el contenido ya no esté.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={inicioPorRol(rol)} className="btn-primary">Ir al inicio</Link>
        <Link to="/catalogo" className="btn-secondary">Explorar catálogo</Link>
      </div>
    </main>
  );
}
