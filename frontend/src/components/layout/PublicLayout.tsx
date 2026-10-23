import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { Logo } from './Logo';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useSession } from '../../auth/SessionProvider';
import { useCart } from '../../cart/CartProvider';
import { inicioPorRol } from '../../auth/permisos';
import { cn } from '../../lib/utils';

export function PublicLayout() {
  const { autenticado, rol } = useSession();
  const { totalItems } = useCart();
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    const texto = busqueda.trim();
    navigate(texto ? `/catalogo?q=${encodeURIComponent(texto)}` : '/catalogo');
    setMenuAbierto(false);
  };

  const enlaceClase = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition',
      isActive
        ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-sand-50/95 backdrop-blur dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Principal">
            <NavLink to="/catalogo" className={enlaceClase}>
              Catálogo
            </NavLink>
            {rol && rol !== 'comprador' && (
              <NavLink to={inicioPorRol(rol)} className={enlaceClase}>
                <span className="inline-flex items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4" /> Mi panel
                </span>
              </NavLink>
            )}
          </nav>

          <form onSubmit={buscar} className="ml-auto hidden max-w-md flex-1 sm:block" role="search">
            <label className="relative block">
              <span className="sr-only">Buscar productos</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Busca frutas, comidas, artesanías…"
                className="input pl-9"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
            <ThemeToggle />
            <NotificationBell />
            <Link to="/carrito" className="btn-ghost relative p-2.5" aria-label={`Carrito, ${totalItems} productos`}>
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
            {autenticado ? (
              <div className="hidden sm:block">
                <AccountMenu />
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="btn-ghost">
                  Ingresar
                </Link>
                <Link to="/registro" className="btn-primary">
                  Crear cuenta
                </Link>
              </div>
            )}
            <button
              type="button"
              className="btn-ghost p-2.5 md:hidden"
              onClick={() => setMenuAbierto((valor) => !valor)}
              aria-expanded={menuAbierto}
              aria-label="Abrir menú"
            >
              {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuAbierto && (
          <div className="border-t px-4 py-3 md:hidden">
            <form onSubmit={buscar} className="mb-3" role="search">
              <label className="relative block">
                <span className="sr-only">Buscar productos</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar en RioMarket"
                  className="input pl-9"
                />
              </label>
            </form>
            <nav className="flex flex-col gap-1" aria-label="Menú móvil">
              <NavLink to="/catalogo" className={enlaceClase} onClick={() => setMenuAbierto(false)}>
                Catálogo
              </NavLink>
              {autenticado ? (
                <>
                  <NavLink to="/mis-pedidos" className={enlaceClase} onClick={() => setMenuAbierto(false)}>
                    Mis pedidos
                  </NavLink>
                  <NavLink to="/perfil" className={enlaceClase} onClick={() => setMenuAbierto(false)}>
                    Mi perfil
                  </NavLink>
                  {rol && rol !== 'comprador' && (
                    <NavLink to={inicioPorRol(rol)} className={enlaceClase} onClick={() => setMenuAbierto(false)}>
                      Mi panel
                    </NavLink>
                  )}
                </>
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
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t bg-white/60 dark:bg-slate-900/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              El mercado local de Riohacha, en un solo lugar. Compra directo a vendedores de tu ciudad.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Comprar</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:underline" to="/catalogo">Catálogo</Link></li>
              <li><Link className="hover:underline" to="/carrito">Carrito</Link></li>
              <li><Link className="hover:underline" to="/mis-pedidos">Mis pedidos</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Vender</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:underline" to="/registro?rol=vendedor">Crear cuenta de vendedor</Link></li>
              <li><Link className="hover:underline" to="/vendedor">Panel de vendedor</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">RioMarket</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Riohacha, La Guajira · Colombia
              <br />
              Soporte: soporte@riomarket.test
            </p>
          </div>
        </div>
        <div className="border-t px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} RioMarket. Proyecto académico; pagos en modo sandbox.
        </div>
      </footer>
    </div>
  );
}
