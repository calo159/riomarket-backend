import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

/** Marca tipográfica del diseño: «Rio» + «Market» en amarillo sobre turquesa. */
export function Logo({
  className,
  sobreMarca = false,
}: {
  className?: string;
  /** compacto se conserva por compatibilidad: ya no hay icono aparte. */
  compacto?: boolean;
  /** true cuando va sobre el encabezado turquesa o el pie oscuro. */
  sobreMarca?: boolean;
}) {
  return (
    <Link
      to="/tienda"
      className={cn(
        'inline-flex items-center rounded-lg text-[27px] font-extrabold tracking-[-0.03em]',
        sobreMarca ? 'text-white hover:text-white' : 'text-brand-600 dark:text-white',
        className,
      )}
      aria-label="RioMarket, ir al inicio"
    >
      Rio<span className={sobreMarca ? 'text-amarillo' : 'text-accion dark:text-amarillo'}>Market</span>
    </Link>
  );
}
