import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './SessionProvider';
import { CargandoPantalla } from '../components/ui/Estado';
import { useAcceso } from '../navigation/useMenu';
import type { Rol } from '../lib/types';

interface Props {
  /** Restringe por rol base (rutas generales de la cuenta). */
  roles?: Rol[];
  /** Restringe por recurso RBAC: se espera a que cargue el menú del backend. */
  recurso?: string;
}

export function RutaProtegida({ roles, recurso }: Props) {
  const { estado, usuario } = useSession();
  const { tiene, cargando } = useAcceso();
  const location = useLocation();

  if (estado === 'cargando') return <CargandoPantalla />;

  if (estado !== 'autenticado' || !usuario) {
    const destino = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(destino)}`} replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/403" replace />;
  }

  if (recurso) {
    if (cargando) return <CargandoPantalla />;
    if (!tiene(recurso)) return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
