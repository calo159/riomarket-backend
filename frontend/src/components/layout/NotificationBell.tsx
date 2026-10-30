import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMenu } from '../../navigation/useMenu';
import { useSession } from '../../auth/SessionProvider';

export function NotificationBell() {
  const { autenticado } = useSession();
  // El conteo viaja en los badges del menú (que ya se sondea cada minuto): sin sondeo propio.
  const { badges } = useMenu();

  if (!autenticado) return null;
  const cantidad = badges.notificaciones ?? 0;

  return (
    <Link
      to="/notificaciones"
      className="btn-ghost relative p-2.5"
      aria-label={cantidad ? `${cantidad} notificaciones sin leer` : 'Notificaciones'}
    >
      <Bell className="h-5 w-5" />
      {cantidad > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rojo-600 px-1 text-[10px] font-bold text-white">
          {cantidad > 9 ? '9+' : cantidad}
        </span>
      )}
    </Link>
  );
}
