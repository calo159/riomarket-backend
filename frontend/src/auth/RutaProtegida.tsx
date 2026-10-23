import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './SessionProvider';
import { CargandoPantalla } from '../components/ui/Estado';
import type { Rol } from '../lib/types';

export function RutaProtegida({ roles }: { roles?: Rol[] }) {
  const { estado, usuario } = useSession();
  const location = useLocation();

  if (estado === 'cargando') return <CargandoPantalla />;

  if (estado !== 'autenticado' || !usuario) {
    const destino = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(destino)}`} replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
