import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Pencil } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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
    // El fondo y la barra de la opción activa los dibuja `IndicadorActivo` (se desliza de una opción a otra).
    return cn(
      'relative z-[1] flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors md:min-h-[40px]',
      isActive
        ? 'text-brand-700 dark:text-brand-200'
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
  onEditar,
}: {
  items: MenuItem[];
  badges: Record<string, number>;
  variante?: Variante;
  onNavegar?: () => void;
  /** Todos los ítems del menú, para detectar la raíz de un panel entre grupos. */
  todos?: MenuItem[];
  /** Si viene, cada opción lleva un lápiz para editarla (modo «Editar menú» del panel). */
  onEditar?: (item: MenuItem) => void;
}) {
  return (
    <>
      {items.map((item, posicion) => {
        const Icono = iconoDe(item.icono);
        const badge = textoBadge(badges[item.codigo]);
        const enlace = (
          <NavLink
            key={item.codigo}
            to={item.ruta}
            end={esRaiz(item, todos)}
            className={({ isActive }) =>
              cn(enlaceClase(variante)({ isActive }), variante === 'vertical' && 'menu-opcion', onEditar && 'min-w-0 flex-1')
            }
            style={variante === 'vertical' ? ({ '--i': posicion } as CSSProperties) : undefined}
            // En el panel, el cambio de pantalla se hace con una transición (sale la anterior y entra la nueva).
            viewTransition={variante === 'vertical'}
            onClick={onNavegar}
          >
            <span className="inline-flex w-full items-center gap-2">
              {variante !== 'encabezado' && <Icono className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
              {badge && (
                <span
                  key={badge}
                  className="flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-accion px-1 text-[11px] font-bold text-white"
                  aria-label={`${badge} pendientes`}
                >
                  {badge}
                </span>
              )}
            </span>
          </NavLink>
        );
        if (!onEditar) return enlace;
        return (
          <div key={item.codigo} className="flex items-center gap-1">
            {enlace}
            <button
              type="button"
              className="btn-ghost !min-h-[44px] !min-w-[40px] shrink-0 p-2 md:!min-h-[40px]"
              aria-label={`Editar «${item.nombre}»`}
              onClick={() => onEditar(item)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </>
  );
}

/**
 * Fondo y barrita de la opción activa. Es una sola pieza que se desliza hasta la opción nueva cuando cambias de pantalla
 * (en vez de apagarse en una y encenderse en otra). Se mide sobre el enlace con `aria-current="page"`; la primera vez se
 * coloca sin animar y se vuelve a medir si el menú cambia de tamaño (insignias, modo de edición, pantalla angosta).
 */
function IndicadorActivo({ contenedor, dependencias }: { contenedor: RefObject<HTMLDivElement>; dependencias: unknown[] }) {
  const indicador = useRef<HTMLSpanElement>(null);
  const [animar, setAnimar] = useState(false);
  const { pathname } = useLocation();

  const medir = useCallback(() => {
    const cont = contenedor.current;
    const pieza = indicador.current;
    if (!cont || !pieza) return;
    const activo = cont.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!activo) {
      pieza.style.opacity = '0';
      return;
    }
    // `offset*` mide el diseño y no cuenta lo que una animación de entrada está desplazando en ese momento.
    pieza.style.opacity = '1';
    pieza.style.width = `${activo.offsetWidth}px`;
    pieza.style.height = `${activo.offsetHeight}px`;
    pieza.style.transform = `translate(${activo.offsetLeft}px, ${activo.offsetTop}px)`;
  }, [contenedor]);

  useLayoutEffect(() => {
    medir();
    // Hasta después de la primera medida no hay transición: así no «viaja» desde la esquina al abrir el panel.
    const cuadro = requestAnimationFrame(() => setAnimar(true));
    return () => cancelAnimationFrame(cuadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, medir, ...dependencias]);

  useEffect(() => {
    const cont = contenedor.current;
    if (!cont) return undefined;
    window.addEventListener('resize', medir);
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(cont);
    return () => {
      window.removeEventListener('resize', medir);
      observador?.disconnect();
    };
  }, [contenedor, medir]);

  return (
    <span
      ref={indicador}
      aria-hidden="true"
      className={cn(
        'menu-indicador pointer-events-none absolute left-0 top-0 rounded-lg bg-brand-50 opacity-0 dark:bg-slate-800',
        animar && 'menu-indicador-anima',
      )}
    />
  );
}

/** Menú vertical del panel, con los recursos agrupados por su grupo. */
export function MenuPanel({
  items,
  badges,
  onNavegar,
  onEditar,
}: {
  items: MenuItem[];
  badges: Record<string, number>;
  onNavegar?: () => void;
  onEditar?: (item: MenuItem) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  return (
    <div ref={contenedor} className="relative space-y-2">
      <IndicadorActivo contenedor={contenedor} dependencias={[items, Boolean(onEditar)]} />
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
            onEditar={onEditar}
          />
        </div>
      ))}
    </div>
  );
}
