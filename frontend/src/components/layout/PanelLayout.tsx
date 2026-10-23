import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  ShieldCheck,
  Star,
  Store,
  Ticket,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useSession } from '../../auth/SessionProvider';
import { ETIQUETAS_ROL } from '../../lib/format';
import { iniciales, cn } from '../../lib/utils';

interface EnlacePanel {
  to: string;
  etiqueta: string;
  icono: LucideIcon;
  fin?: boolean;
}

const ENLACES_VENDEDOR: EnlacePanel[] = [
  { to: '/vendedor', etiqueta: 'Resumen', icono: LayoutDashboard, fin: true },
  { to: '/vendedor/verificacion', etiqueta: 'Verificación', icono: BadgeCheck },
  { to: '/vendedor/puestos', etiqueta: 'Mis puestos', icono: Store },
  { to: '/vendedor/productos', etiqueta: 'Productos', icono: Package },
  { to: '/vendedor/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
  { to: '/vendedor/cupones', etiqueta: 'Cupones', icono: Ticket },
  { to: '/vendedor/resenas', etiqueta: 'Reseñas', icono: Star },
];

const ENLACES_ADMIN: EnlacePanel[] = [
  { to: '/admin', etiqueta: 'Resumen', icono: LayoutDashboard, fin: true },
  { to: '/admin/verificaciones', etiqueta: 'Verificaciones', icono: ShieldCheck },
  { to: '/admin/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
  { to: '/admin/puestos', etiqueta: 'Puestos', icono: Store },
  { to: '/admin/pagos', etiqueta: 'Pagos', icono: CreditCard },
  { to: '/admin/cupones', etiqueta: 'Cupones', icono: Percent },
  { to: '/admin/auditoria', etiqueta: 'Auditoría', icono: BookOpenCheck },
];

export function PanelLayout() {
  const { usuario, rol, cerrarSesion } = useSession();
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setAbierto(false);
  }, [location.pathname]);

  if (!usuario) return null;

  const enlaces = rol === 'administrador' ? ENLACES_ADMIN : ENLACES_VENDEDOR;
  const tituloPanel = rol === 'administrador' ? 'Administración' : 'Panel de vendedor';

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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tituloPanel}</p>
        <p className="mt-1 truncate text-sm font-semibold">{usuario.nombre}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{ETIQUETAS_ROL[usuario.rol]}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación del panel">
        {enlaces.map(({ to, etiqueta, icono: Icono, fin }) => (
          <NavLink
            key={to}
            to={to}
            end={fin}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            <Icono className="h-4 w-4 shrink-0" />
            {etiqueta}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t p-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Store className="h-4 w-4" /> Ver la tienda
        </Link>
        <button
          type="button"
          onClick={() => void salir()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setAbierto(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] border-r bg-white shadow-2xl dark:bg-slate-900">
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur dark:bg-slate-900/90 sm:px-6">
          <button
            type="button"
            className="btn-ghost p-2 lg:hidden"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
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
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200"
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
