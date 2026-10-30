import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { iconoDe } from '../../navigation/iconos';
import { agruparItems, type MenuItem } from '../../navigation/tipos';

type Variante = 'horizontal' | 'vertical' | 'cuenta';

function textoBadge(valor: number | undefined): string | null {
  if (!valor || valor <= 0) return null;
  return valor > 99 ? '99+' : String(valor);
}

function enlaceClase(variante: Variante) {
  return ({ isActive }: { isActive: boolean }) => {
    if (variante === 'horizontal') {
      return cn(
        'rounded-lg px-3 py-2 text-sm font-medium transition',
        isActive
          ? 'bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      );
    }
    if (variante === 'cuenta') {
      return 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800';
    }
    return cn(
      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
      isActive
        ? 'bg-brand-600 text-white dark:bg-brand-500'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    );
  };
}

/** La raíz de un panel (/admin) solo se marca activa en su ruta exacta. */
function esRaiz(item: MenuItem, items: MenuItem[]) {
  return items.some((otro) => otro.codigo !== item.codigo && otro.ruta.startsWith(`${item.ruta}/`));
}

export function MenuItems({
  items,
  badges,
  variante = 'horizontal',
  onNavegar,
  todos = items,
}: {
  items: MenuItem[];
  badges: Record<string, number>;
  variante?: Variante;
  onNavegar?: () => void;
  /** Todos los ítems del menú, para detectar la raíz de un panel entre grupos. */
  todos?: MenuItem[];
}) {
  return (
    <>
      {items.map((item) => {
        const Icono = iconoDe(item.icono);
        const badge = textoBadge(badges[item.codigo]);
        return (
          <NavLink
            key={item.codigo}
            to={item.ruta}
            end={esRaiz(item, todos)}
            className={enlaceClase(variante)}
            onClick={onNavegar}
          >
            <span className="inline-flex w-full items-center gap-2">
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
              {badge && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rojo-600 px-1 text-[10px] font-bold text-white"
                  aria-label={`${badge} pendientes`}
                >
                  {badge}
                </span>
              )}
            </span>
          </NavLink>
        );
      })}
    </>
  );
}

/** Menú vertical del panel, con los recursos agrupados por su grupo. */
export function MenuPanel({
  items,
  badges,
  onNavegar,
}: {
  items: MenuItem[];
  badges: Record<string, number>;
  onNavegar?: () => void;
}) {
  return (
    <>
      {agruparItems(items).map((grupo, indice) => (
        <div key={grupo.grupo ?? `grupo-${indice}`} className="space-y-1">
          {grupo.grupo && (
            <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {grupo.grupo}
            </p>
          )}
          <MenuItems
            items={grupo.items}
            badges={badges}
            variante="vertical"
            onNavegar={onNavegar}
            todos={items}
          />
        </div>
      ))}
    </>
  );
}
