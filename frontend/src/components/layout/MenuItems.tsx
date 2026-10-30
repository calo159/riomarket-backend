import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { iconoDe } from '../../navigation/iconos';
import { agruparItems, type MenuItem } from '../../navigation/tipos';

type Variante = 'horizontal' | 'vertical' | 'cuenta' | 'encabezado';

function textoBadge(valor: number | undefined): string | null {
  if (!valor || valor <= 0) return null;
  return valor > 99 ? '99+' : String(valor);
}

function enlaceClase(variante: Variante) {
  return ({ isActive }: { isActive: boolean }) => {
    if (variante === 'encabezado') {
      // Sobre el encabezado turquesa: texto claro, activo con subrayado amarillo.
      return cn(
        'inline-flex min-h-[32px] items-center border-b-2 py-1 text-sm font-medium transition-colors',
        isActive
          ? 'border-amarillo text-white'
          : 'border-transparent text-[#E2F3F5] hover:text-white',
      );
    }
    if (variante === 'horizontal') {
      return cn(
        'rounded-lg px-3 py-2.5 text-sm font-semibold transition',
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-200'
          : 'text-slate-700 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      );
    }
    if (variante === 'cuenta') {
      return 'flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-brand-200 md:min-h-[40px]';
    }
    return cn(
      'relative flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors md:min-h-[40px]',
      isActive
        ? 'bg-brand-50 text-brand-700 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-brand-600 dark:bg-slate-800 dark:text-brand-200 dark:before:bg-brand-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
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
              {variante !== 'encabezado' && <Icono className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
              {badge && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accion px-1 text-[11px] font-bold text-white"
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
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
