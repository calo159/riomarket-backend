import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { ItemMenu } from './menu';
import type { BadgesMenu } from './useMenuBadges';

export type VarianteMenu = 'horizontal' | 'vertical' | 'movil';

interface Props {
  items: ItemMenu[];
  variante: VarianteMenu;
  badges?: BadgesMenu;
  mostrarBadges?: boolean;
  onNavegar?: () => void;
  ariaLabel?: string;
}

const CONTENEDOR: Record<VarianteMenu, string> = {
  horizontal: 'flex items-center gap-1',
  vertical: 'space-y-1',
  movil: 'flex flex-col gap-1',
};

const ITEM: Record<VarianteMenu, string> = {
  horizontal: 'rounded-lg px-3 py-2 text-sm font-medium',
  vertical: 'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium',
  movil: 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
};

const ACTIVO: Record<VarianteMenu, string> = {
  horizontal: 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200',
  vertical: 'bg-brand-600 text-white shadow-sm',
  movil: 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200',
};

const INACTIVO: Record<VarianteMenu, string> = {
  horizontal:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  vertical:
    'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  movil:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
};

export function MenuItems({
  items,
  variante,
  badges = {},
  mostrarBadges = true,
  onNavegar,
  ariaLabel = 'Navegación',
}: Props) {
  return (
    <nav className={CONTENEDOR[variante]} aria-label={ariaLabel}>
      {items.map((item) => {
        const Icono = item.icono;
        const cantidad = mostrarBadges && item.badge ? badges[item.badge] : undefined;
        const conBadge = cantidad != null && cantidad > 0;
        return (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.fin}
            onClick={onNavegar}
            className={({ isActive }) =>
              cn(
                ITEM[variante],
                'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                isActive ? ACTIVO[variante] : INACTIVO[variante],
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.etiqueta}</span>
                {conBadge && (
                  <span
                    aria-hidden="true"
                    title={`${cantidad} pendientes`}
                    className={cn(
                      'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                      variante === 'vertical' && isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-600 text-white',
                    )}
                  >
                    {cantidad > 99 ? '99+' : cantidad}
                  </span>
                )}
                {isActive && <span className="sr-only"> (página actual)</span>}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
