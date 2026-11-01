import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  LayoutGrid,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  ShoppingCart,
  Truck,
  User,
} from 'lucide-react';
import { BordeFestoneado } from '../ui/Decoracion';
import { Logo } from './Logo';
import { AccountMenu } from './AccountMenu';
import { BuscadorEncabezado } from './BuscadorEncabezado';
import { NotificationBell } from './NotificationBell';
import { MenuItems } from './MenuItems';
import { ContadorCarrito } from './ContadorCarrito';
import { Modal } from '../ui/Modal';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useSession } from '../../auth/SessionProvider';
import { useCart } from '../../cart/CartProvider';
import { useMenu } from '../../navigation/useMenu';
import { itemsDe, primerPanel } from '../../navigation/tipos';
import { listarCategorias } from '../../api/catalog';
import { claves } from '../../lib/queryKeys';
import { DESTINO_CARRITO } from '../../lib/volarAlCarrito';
import { cn } from '../../lib/utils';

export function PublicLayout() {
  const { autenticado, cerrarSesion } = useSession();
  const { menu, badges } = useMenu();
  const panel = primerPanel(menu);
  const publicos = itemsDe(menu, 'publico');
  const tiene = (codigo: string) => menu.recursos.includes(codigo);
  const { totalItems } = useCart();
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const navigate = useNavigate();
  const ubicacion = useLocation();

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias, staleTime: 5 * 60_000 });

  const salir = async () => {
    setCuentaAbierta(false);
    await cerrarSesion();
    navigate('/');
  };

  const hayPedidos = !autenticado || tiene('mis_pedidos');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-gradient-to-b from-brand-600 to-[#005560] text-white dark:from-brand-900 dark:to-brand-950">
        <div className="mx-auto max-w-[1240px] px-3 sm:px-5">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 pb-2 pt-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-7 md:pb-2.5 md:pt-3.5">
            <Logo sobreMarca className="text-2xl md:text-[27px]" />

            <BuscadorEncabezado categorias={categorias.data} />

            <div className="flex items-center justify-end gap-0.5">
              <div className="hidden items-center gap-0.5 text-white md:flex">
                <ThemeToggle variante="encabezado" />
                <NotificationBell variante="encabezado" />
                {hayPedidos && (
                  <Link to="/mis-pedidos" className="acto-encabezado">
                    <Truck className="h-[22px] w-[22px]" aria-hidden="true" />
                    Mis pedidos
                  </Link>
                )}
              </div>
              <div className="flex items-center md:hidden">
                <ThemeToggle variante="encabezado" />
                <NotificationBell variante="encabezado" />
              </div>
              <Link
                to="/carrito"
                {...{ [DESTINO_CARRITO]: '' }}
                className="acto-encabezado relative"
                aria-label={`Carrito, ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`}
              >
                <ShoppingCart className="h-6 w-6" aria-hidden="true" />
                <ContadorCarrito total={totalItems} className="absolute left-[22px] top-0 md:left-[22px]" />
                <span className="hidden md:inline md:ml-1.5">Carrito</span>
              </Link>
              {/* La cuenta (o «Ingresar») va al borde derecho, después del carrito; en el celular el menú de cuenta está en la barra de abajo. */}
              {autenticado ? (
                <div className="hidden md:block">
                  <AccountMenu variante="encabezado" />
                </div>
              ) : (
                <Link to="/login" className="acto-encabezado" aria-label="Ingresar">
                  <User className="h-[22px] w-[22px]" aria-hidden="true" />
                  <span className="hidden min-[400px]:inline">Ingresar</span>
                </Link>
              )}
            </div>
          </div>

          <nav className="hidden flex-wrap items-center gap-x-6 gap-y-1 pb-2.5 md:flex" aria-label="Principal">
            <span className="mr-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Entregar en Riohacha
            </span>
            <MenuItems items={publicos} badges={badges} variante="encabezado" />
            <NavLink
              to="/mapa"
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-[32px] items-center border-b-2 py-1 text-sm font-medium transition-colors',
                  isActive ? 'border-amarillo text-white' : 'border-transparent text-[#E2F3F5] hover:text-white',
                )
              }
            >
              Mapa
            </NavLink>
            {panel && (
              <NavLink
                to={panel.ruta}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-[32px] items-center border-b-2 py-1 text-sm font-medium transition-colors',
                    isActive ? 'border-amarillo text-white' : 'border-transparent text-[#E2F3F5] hover:text-white',
                  )
                }
              >
                Panel
              </NavLink>
            )}
            {!autenticado && (
              <Link
                to="/registro?rol=vendedor"
                className="inline-flex min-h-[32px] items-center border-b-2 border-transparent py-1 text-sm font-medium text-[#E2F3F5] transition-colors hover:text-white"
              >
                Vender en RioMarket
              </Link>
            )}
          </nav>
          <div className="flex items-center justify-between gap-3 pb-1 text-[13px] font-semibold md:hidden">
            <p className="flex items-center gap-1.5">
              <MapPin className="h-[15px] w-[15px]" aria-hidden="true" /> Entregar en Riohacha
            </p>
            <NavLink
              to="/mapa"
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-[44px] items-center border-b-2 px-1',
                  isActive ? 'border-amarillo' : 'border-transparent',
                )
              }
            >
              Mapa de puestos
            </NavLink>
          </div>
        </div>
      </header>

      <main key={ubicacion.pathname} className="ruta-entra flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <footer className="relative mt-10 bg-pie py-8 text-sm text-[#CFDCE1] max-md:mb-16">
        <BordeFestoneado />
        <div className="mx-auto grid max-w-[1240px] gap-6 px-5 md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <div>
            <Logo sobreMarca className="!text-[23px]" />
            <p className="mt-2.5 max-w-xs">El mercado de Riohacha en línea. Compra directo a vendedores de tu ciudad.</p>
          </div>
          <div>
            <h2 className="font-bold text-white">Comprar</h2>
            <ul className="mt-1">
              <li><Link className="pie-enlace" to="/catalogo">Catálogo</Link></li>
              <li><Link className="pie-enlace" to="/mapa">Mapa de puestos</Link></li>
              <li><Link className="pie-enlace" to="/carrito">Carrito</Link></li>
              {tiene('mis_pedidos') && <li><Link className="pie-enlace" to="/mis-pedidos">Mis pedidos</Link></li>}
            </ul>
          </div>
          <div>
            <h2 className="font-bold text-white">Vender</h2>
            <ul className="mt-1">
              {!autenticado && (
                <li><Link className="pie-enlace" to="/registro?rol=vendedor">Crear cuenta de vendedor</Link></li>
              )}
              {panel && <li><Link className="pie-enlace" to={panel.ruta}>Ir a mi panel</Link></li>}
            </ul>
          </div>
          <div>
            <h2 className="font-bold text-white">RioMarket</h2>
            <p className="mt-2">
              Riohacha, La Guajira · Colombia
              <br />
              Soporte: soporte@riomarket.test
              <br />
              <Link className="pie-enlace" to="/creditos-fotos">Créditos de fotos</Link>
            </p>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-[1240px] border-t border-white/10 px-5 pt-4 text-xs">
          © {new Date().getFullYear()} RioMarket. Proyecto académico; pagos en modo sandbox.
        </p>
      </footer>

      {/* Barra inferior del celular: 5 destinos reales según permisos. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-900"
        aria-label="Navegación"
      >
        <Pestana to="/tienda" end icono={Home} etiqueta="Inicio" />
        <Pestana to="/catalogo" icono={LayoutGrid} etiqueta="Catálogo" />
        <Pestana
          to="/carrito"
          icono={ShoppingCart}
          etiqueta="Carrito"
          destino
          contador={totalItems}
          aria={`Carrito, ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`}
        />
        {hayPedidos ? (
          <Pestana to="/mis-pedidos" icono={Package} etiqueta="Pedidos" />
        ) : panel ? (
          <Pestana to={panel.ruta} icono={LayoutDashboard} etiqueta="Panel" />
        ) : (
          <Pestana to="/catalogo" icono={Package} etiqueta="Pedidos" />
        )}
        <button
          type="button"
          onClick={() => setCuentaAbierta(true)}
          aria-haspopup="dialog"
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-600 transition-colors active:text-brand-600 dark:text-slate-300"
        >
          <User className="h-[23px] w-[23px]" aria-hidden="true" />
          Cuenta
        </button>
      </nav>

      <Modal abierto={cuentaAbierta} onCerrar={() => setCuentaAbierta(false)} titulo="Tu cuenta">
        {autenticado ? (
          <div className="flex flex-col gap-1">
            <div onClick={() => setCuentaAbierta(false)} className="flex flex-col gap-1">
              <MenuItems items={itemsDe(menu, 'cuenta')} badges={badges} variante="cuenta" />
              {panel && (
                <Link
                  to={panel.ruta}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-slate-800"
                >
                  <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" /> Panel
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => void salir()}
              className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" /> Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link to="/login" className="btn-primary" onClick={() => setCuentaAbierta(false)}>
              Ingresar
            </Link>
            <Link to="/registro" className="btn-secondary" onClick={() => setCuentaAbierta(false)}>
              Crear cuenta
            </Link>
            <Link
              to="/registro?rol=vendedor"
              className="link mt-1 text-center text-sm"
              onClick={() => setCuentaAbierta(false)}
            >
              Vender en RioMarket
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Pestana({
  to,
  icono: Icono,
  etiqueta,
  end,
  destino,
  contador,
  aria,
}: {
  to: string;
  icono: typeof Home;
  etiqueta: string;
  end?: boolean;
  destino?: boolean;
  contador?: number;
  aria?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={aria}
      {...(destino ? { [DESTINO_CARRITO]: '' } : {})}
      className={({ isActive }) =>
        cn(
          'relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
          isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300',
        )
      }
    >
      <span className="relative">
        <Icono className="h-[23px] w-[23px]" aria-hidden="true" />
        {contador ? <ContadorCarrito total={contador} className="absolute -right-3 -top-1.5" /> : null}
      </span>
      {etiqueta}
    </NavLink>
  );
}
