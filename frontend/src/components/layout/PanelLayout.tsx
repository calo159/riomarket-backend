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
      <div className="flex h-16 items-center border-b px-4">
        <Logo />
      </div>
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{tituloPanel}</p>
        <p className="mt-1 truncate text-sm font-semibold">{usuario.nombre}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{ETIQUETAS_ROL[usuario.rol]}</p>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Navegación del panel">
        <MenuPanel items={itemsPanel} badges={badges} onNavegar={() => setAbierto(false)} />
      </nav>
      <div className="space-y-1 border-t p-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Store className="h-4 w-4" /> Ver la tienda
        </Link>
        <button
          type="button"
          onClick={() => void salir()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rojo-600 hover:bg-rojo-50 dark:text-rojo-400 dark:hover:bg-rojo-950/40"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white dark:bg-slate-900 lg:block">
        {barraLateral}
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setAbierto(false)}
          />
          <aside
            id="menu-movil-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="relative h-full w-72 max-w-[85vw] border-r bg-white dark:bg-slate-900"
          >
            <button
              type="button"
              className="btn-ghost absolute right-2 top-3 p-2"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            {barraLateral}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white px-4 dark:bg-slate-900 sm:px-6">
          <button
            type="button"
            className="btn-ghost p-2 lg:hidden"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
            aria-controls="menu-movil-panel"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tituloPanel}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {usuario.correo}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <span
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white dark:bg-brand-500"
              title={usuario.nombre}
            >
              {iniciales(usuario.nombre)}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
