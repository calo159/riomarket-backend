import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, Menu, Search, X } from 'lucide-react';
import { Logo } from './Logo';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import { MenuItems } from './MenuItems';
import { CanastaIcono } from './CanastaIcono';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useSession } from '../../auth/SessionProvider';
import { useCart } from '../../cart/CartProvider';
import { useMenu } from '../../navigation/useMenu';
import { itemsDe, primerPanel } from '../../navigation/tipos';
import { cn } from '../../lib/utils';

function BuscadorEncabezado({
  valor,
  alCambiar,
  alBuscar,
  className,
}: {
  valor: string;
  alCambiar: (texto: string) => void;
  alBuscar: (evento: FormEvent) => void;
  className?: string;
}) {
  return (
    <form onSubmit={alBuscar} className={className} role="search">
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        <input
          type="search"
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder="Busca frutas, comidas, artesanías"
          className="input pl-9"
        />
      </label>
    </form>
  );
}

const PESTANA =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:ring-inset';

export function PublicLayout() {
  const { autenticado } = useSession();
  const { menu, badges } = useMenu();
  const panel = primerPanel(menu);
  const publicos = itemsDe(menu, 'publico');
  const tiene = (codigo: string) => menu.recursos.includes(codigo);
  const { totalItems } = useCart();
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // En la canasta y el pago la acción principal va fija abajo: no se apila la barra de pestañas.
  const conPestanas = !/^\/(carrito|checkout)/.test(pathname);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    const texto = busqueda.trim();
    navigate(texto ? `/catalogo?q=${encodeURIComponent(texto)}` : '/catalogo');
    setMenuAbierto(false);
  };

  const enlaceCanasta = (
    <Link
      to="/carrito"
      className="btn-ghost relative gap-1.5 px-2.5"
      aria-label={`Canasta, ${totalItems} productos`}
    >
      <CanastaIcono cantidad={totalItems} />
      {totalItems > 0 && (
        <span className="tnum min-w-4 text-sm font-bold" aria-hidden="true">
          {totalItems}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-white dark:bg-slate-950">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Principal">
            <MenuItems items={publicos} badges={badges} variante="horizontal" />
            {panel && (
              <Link
                to={panel.ruta}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Panel
              </Link>
            )}
          </nav>

          <BuscadorEncabezado
            valor={busqueda}
            alCambiar={setBusqueda}
            alBuscar={buscar}
            className="ml-auto hidden max-w-md flex-1 sm:block"
          />

          <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden md:block">{enlaceCanasta}</div>
            {autenticado ? (
              <div className="hidden sm:block">
                <AccountMenu />
              </div>
            ) : (
              <div className="hidden items-center gap-1 sm:flex">
                <Link to="/login" className="btn-ghost">
                  Ingresar
                </Link>
                <Link to="/registro" className="btn-secondary">
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-2.5 sm:hidden">
          <BuscadorEncabezado valor={busqueda} alCambiar={setBusqueda} alBuscar={buscar} />
        </div>
      </header>

      {menuAbierto && (
        <div
          id="menu-movil"
          className="fixed inset-x-0 bottom-14 z-40 max-h-[70vh] overflow-y-auto border-t-2 border-slate-950 bg-white px-4 py-3 dark:border-slate-300 dark:bg-slate-950 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Menú móvil">
            <MenuItems
              items={publicos}
              badges={badges}
              variante="horizontal"
              onNavegar={() => setMenuAbierto(false)}
            />
            {panel && (
              <Link
                to={panel.ruta}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setMenuAbierto(false)}
              >
                Panel
              </Link>
            )}
            {autenticado ? (
              <MenuItems
                items={itemsDe(menu, 'cuenta')}
                badges={badges}
                variante="horizontal"
                onNavegar={() => setMenuAbierto(false)}
              />
            ) : (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="btn-secondary flex-1" onClick={() => setMenuAbierto(false)}>
                  Ingresar
                </Link>
                <Link to="/registro" className="btn-primary flex-1" onClick={() => setMenuAbierto(false)}>
                  Crear cuenta
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}

      <main className={cn('flex-1', conPestanas && 'pb-14 md:pb-0')}>
        <Outlet />
      </main>

      <footer className="mt-16 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Logo />
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <li><Link className="hover:underline" to="/catalogo">Catálogo</Link></li>
            <li><Link className="hover:underline" to="/carrito">Canasta</Link></li>
            {tiene('mis_pedidos') && (
              <li><Link className="hover:underline" to="/mis-pedidos">Mis pedidos</Link></li>
            )}
            {!autenticado && (
              <li><Link className="hover:underline" to="/registro?rol=vendedor">Vender en RioMarket</Link></li>
            )}
            {panel && (
              <li><Link className="hover:underline" to={panel.ruta}>Mi panel</Link></li>
            )}
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Riohacha, La Guajira · soporte@riomarket.test
          </p>
        </div>
        <p className="border-t px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400">
          © {new Date().getFullYear()} RioMarket. Proyecto académico; los pagos funcionan en modo de prueba.
        </p>
      </footer>

      {conPestanas && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 flex border-t-2 border-slate-950 bg-white dark:border-slate-300 dark:bg-slate-950 md:hidden"
          aria-label="Atajos"
        >
          <NavLink to="/" end className={({ isActive }) => cn(PESTANA, isActive && 'text-brand-700 dark:text-brand-300')}>
            <Home className="h-5 w-5" aria-hidden="true" /> Inicio
          </NavLink>
          <NavLink to="/catalogo" className={({ isActive }) => cn(PESTANA, isActive && 'text-brand-700 dark:text-brand-300')}>
            <LayoutGrid className="h-5 w-5" aria-hidden="true" /> Catálogo
          </NavLink>
          <Link to="/carrito" className={PESTANA} aria-label={`Canasta, ${totalItems} productos`}>
            <span className="flex items-center gap-1">
              <CanastaIcono cantidad={totalItems} className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="tnum text-xs font-bold" aria-hidden="true">
                  {totalItems}
                </span>
              )}
            </span>
            Canasta
          </Link>
          <button
            type="button"
            className={PESTANA}
            onClick={() => setMenuAbierto((valor) => !valor)}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
          >
            {menuAbierto ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            {menuAbierto ? 'Cerrar' : autenticado ? 'Cuenta' : 'Menú'}
          </button>
        </nav>
      )}
    </div>
  );
}
