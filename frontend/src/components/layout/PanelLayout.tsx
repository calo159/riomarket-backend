import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Store, X } from 'lucide-react';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { MenuPanel } from './MenuItems';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useSession } from '../../auth/SessionProvider';
import { useMenu } from '../../navigation/useMenu';
import { itemsDe } from '../../navigation/tipos';
import { ETIQUETAS_ROL } from '../../lib/format';
import { iniciales } from '../../lib/utils';

export function PanelLayout() {
  const { usuario, cerrarSesion } = useSession();
  const { menu, badges } = useMenu();
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setAbierto(false);
  }, [location.pathname]);

  if (!usuario) return null;

  const esAdmin = location.pathname.startsWith('/admin');
  const tituloPanel = esAdmin ? 'Administración' : 'Panel de vendedor';
  const itemsPanel = itemsDe(menu, esAdmin ? 'panel_admin' : 'panel_vendedor');

  const salir = async () => {
    await cerrarSesion();
    navigate('/');
  };

  const barraLateral = (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tituloPanel}</p>
        <p className="mt-1 truncate text-sm font-bold">{usuario.nombre}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{ETIQUETAS_ROL[usuario.rol]}</p>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Navegación del panel">
        <MenuPanel items={itemsPanel} badges={badges} onNavegar={() => setAbierto(false)} />
      </nav>
      <div className="space-y-1 border-t p-3">
        <Link
          to="/tienda"
          className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:min-h-[40px]"
        >
          <Store className="h-[18px] w-[18px]" aria-hidden="true" /> Ver la tienda
        </Link>
        <button
          type="button"
          onClick={() => void salir()}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 md:min-h-[40px]"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-fondo dark:bg-slate-950">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 bg-brand-600 px-3 text-white dark:bg-brand-900 sm:px-5">
        <button
          type="button"
          className="acto-encabezado lg:hidden"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          aria-controls="menu-movil-panel"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo sobreMarca className="!text-[22px]" />
        <span className="ml-1 hidden rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold sm:inline">{tituloPanel}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <ThemeToggle variante="encabezado" />
          <NotificationBell variante="encabezado" />
          <Link to="/tienda" className="acto-encabezado hidden sm:inline-flex">
            <Store className="h-5 w-5" aria-hidden="true" /> Ver la tienda
          </Link>
          <span
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-amarillo text-sm font-extrabold text-tinta"
            title={usuario.nombre}
          >
            {iniciales(usuario.nombre)}
          </span>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-60 border-r bg-white dark:bg-slate-900 lg:block">
        {barraLateral}
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 animate-fadein bg-slate-950/60"
            onClick={() => setAbierto(false)}
          />
          <aside
            id="menu-movil-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="relative h-full w-72 max-w-[85vw] animate-slidein border-r bg-white shadow-menu dark:bg-slate-900"
          >
            <button
              type="button"
              className="btn-ghost absolute right-2 top-2 !min-h-[44px] !min-w-[44px] p-2"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            {barraLateral}
          </aside>
        </div>
      )}

      <div className="pt-14 lg:pl-60">
        <main key={location.pathname} className="ruta-entra mx-auto max-w-[1240px] px-3 py-5 sm:px-6 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
