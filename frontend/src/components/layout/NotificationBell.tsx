import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMenu } from '../../navigation/useMenu';
import { useSession } from '../../auth/SessionProvider';

export function NotificationBell({ variante = 'normal' }: { variante?: 'normal' | 'encabezado' }) {
  const { autenticado } = useSession();
  // El conteo viaja en los badges del menú (que ya se sondea cada minuto): sin sondeo propio.
  const { badges } = useMenu();

  const cantidad = badges.notificaciones ?? 0;
  const anterior = useRef(cantidad);
  const [timbre, setTimbre] = useState(0);

  // Suena (se mueve) solo cuando llegan avisos nuevos, no en cada visita ni al leerlos.
  useEffect(() => {
    if (cantidad > anterior.current) setTimbre((n) => n + 1);
    anterior.current = cantidad;
  }, [cantidad]);

  if (!autenticado) return null;

  return (
    <Link
      to="/notificaciones"
      className={variante === 'encabezado' ? 'acto-encabezado relative' : 'btn-ghost relative p-2.5'}
      aria-label={cantidad ? `${cantidad} notificaciones sin leer` : 'Notificaciones'}
    >
      <Bell key={timbre} className={timbre > 0 ? 'h-5 w-5 animate-timbre' : 'h-5 w-5'} />
      {cantidad > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amarillo px-1 text-[11px] font-extrabold text-tinta">
          {cantidad > 9 ? '9+' : cantidad}
        </span>
      )}
    </Link>
  );
}
