import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { MarcaSvg } from './MarcaSvg';

/** Marca de RioMarket: el símbolo (toldo sobre el río) y «Rio» + «Market» en Figtree 800. */
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
        'inline-flex items-center gap-[0.3em] rounded-lg text-[27px] font-extrabold tracking-[-0.03em]',
        sobreMarca ? 'text-white hover:text-white' : 'text-brand-600 dark:text-white',
        className,
      )}
      aria-label="RioMarket, ir al inicio"
    >
      <MarcaSvg conFondo={!sobreMarca} className="h-[1.3em] w-[1.3em] shrink-0" />
      <span>
        Rio<span className={sobreMarca ? 'text-amarillo' : 'text-accion dark:text-amarillo'}>Market</span>
      </span>
    </Link>
  );
}
