import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { iconoDe } from '../../navigation/iconos';
import type { MenuEnlace, MenuGrupo } from '../../navigation/tipos';

type Variante = 'horizontal' | 'vertical' | 'cuenta';

function textoBadge(valor: number | undefined): string | null {
  if (!valor || valor <= 0) return null;
  return valor > 99 ? '99+' : String(valor);
}

function enlaceClase(variante: Variante) {
  return ({ isActive }: { isActive: boolean }) => {
    if (variante === 'horizontal') {
      return cn(
        'rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        isActive
          ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      );
    }
    if (variante === 'cuenta') {
      return 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
    }
    return cn(
      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      isActive
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    );
  };
}

export function MenuEnlaces({
  items,
  badges,
  variante = 'horizontal',
  onNavegar,
}: {
  items: MenuEnlace[];
  badges: Record<string, number>;
  variante?: Variante;
  onNavegar?: () => void;
}) {
  return (
    <>
      {items.map((enlace) => {
        const Icono = iconoDe(enlace.icono);
        const badge = textoBadge(enlace.badge ? badges[enlace.badge] : undefined);
        return (
          <NavLink
            key={`${enlace.to}-${enlace.etiqueta}`}
            to={enlace.to}
            end={enlace.fin}
            className={enlaceClase(variante)}
            onClick={onNavegar}
          >
            <span className="inline-flex w-full items-center gap-2">
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{enlace.etiqueta}</span>
              {badge && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
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

export function MenuPanel({
  grupos,
  badges,
  onNavegar,
}: {
  grupos: MenuGrupo[];
  badges: Record<string, number>;
  onNavegar?: () => void;
}) {
  return (
    <>
      {grupos.map((grupo, indice) => (
        <div key={grupo.grupo ?? `grupo-${indice}`} className="space-y-1">
          {grupo.grupo && (
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {grupo.grupo}
            </p>
          )}
          <MenuEnlaces items={grupo.items} badges={badges} variante="vertical" onNavegar={onNavegar} />
        </div>
      ))}
    </>
  );
}
