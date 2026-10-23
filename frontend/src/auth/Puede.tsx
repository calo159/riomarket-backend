import type { ReactNode } from 'react';
import { puede, type Capacidad } from './permisos';
import { useSession } from './SessionProvider';

export function Puede({
  capacidad,
  children,
  fallback = null,
}: {
  capacidad: Capacidad;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { rol } = useSession();
  return <>{puede(rol, capacidad) ? children : fallback}</>;
}
