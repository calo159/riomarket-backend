import {
  BadgeCheck,
  Bell,
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Star,
  Store,
  Ticket,
  User,
  type LucideIcon,
} from 'lucide-react';
import { puede, type Capacidad } from '../auth/permisos';
import type { Rol } from '../lib/types';

export type AmbitoMenu = 'publico' | 'cuenta' | 'panel-vendedor' | 'panel-admin';

export type BadgeMenu =
  | 'carrito'
  | 'notificaciones'
  | 'comprador-pedidos'
  | 'vendedor-pedidos'
  | 'admin-verificaciones'
  | 'admin-pedidos';

export interface ItemMenu {
  id: string;
  etiqueta: string;
  to: string;
  icono: LucideIcon;
  capacidad: Capacidad;
  roles?: Rol[];
  ambito: AmbitoMenu;
  fin?: boolean;
  badge?: BadgeMenu;
}

/**
 * Registro único de la navegación. Toda la lógica de qué ve cada rol vive
 * aquí; los layouts y menús solo pintan el resultado.
 */
export const MENU: ItemMenu[] = [
  {
    id: 'catalogo',
    etiqueta: 'Catálogo',
    to: '/catalogo',
    icono: ShoppingBasket,
    capacidad: 'verCatalogo',
    ambito: 'publico',
  },
  {
    id: 'carrito',
    etiqueta: 'Carrito',
    to: '/carrito',
    icono: ShoppingCart,
    capacidad: 'gestionarCarrito',
    ambito: 'cuenta',
    badge: 'carrito',
  },
  {
    id: 'mis-pedidos',
    etiqueta: 'Mis pedidos',
    to: '/mis-pedidos',
    icono: Package,
    capacidad: 'verMisPedidos',
    ambito: 'cuenta',
    badge: 'comprador-pedidos',
  },
  {
    id: 'direcciones',
    etiqueta: 'Direcciones',
    to: '/direcciones',
    icono: MapPin,
    capacidad: 'gestionarDirecciones',
    ambito: 'cuenta',
  },
  {
    id: 'notificaciones',
    etiqueta: 'Notificaciones',
    to: '/notificaciones',
    icono: Bell,
    capacidad: 'verNotificaciones',
    ambito: 'cuenta',
    badge: 'notificaciones',
  },
  {
    id: 'perfil',
    etiqueta: 'Mi perfil',
    to: '/perfil',
    icono: User,
    capacidad: 'editarPerfil',
    ambito: 'cuenta',
  },
  {
    id: 'panel-vendedor',
    etiqueta: 'Mi panel',
    to: '/vendedor',
    icono: LayoutDashboard,
    capacidad: 'verPanelVendedor',
    ambito: 'cuenta',
  },
  {
    id: 'panel-admin',
    etiqueta: 'Mi panel',
    to: '/admin',
    icono: LayoutDashboard,
    capacidad: 'verPanelAdmin',
    ambito: 'cuenta',
  },
  {
    id: 'vendedor-resumen',
    etiqueta: 'Resumen',
    to: '/vendedor',
    icono: LayoutDashboard,
    capacidad: 'verPanelVendedor',
    ambito: 'panel-vendedor',
    fin: true,
  },
  {
    id: 'vendedor-verificacion',
    etiqueta: 'Verificación',
    to: '/vendedor/verificacion',
    icono: BadgeCheck,
    capacidad: 'gestionarVerificacion',
    ambito: 'panel-vendedor',
  },
  {
    id: 'vendedor-puestos',
    etiqueta: 'Mis puestos',
    to: '/vendedor/puestos',
    icono: Store,
    capacidad: 'gestionarPuestos',
    ambito: 'panel-vendedor',
  },
  {
    id: 'vendedor-productos',
    etiqueta: 'Productos',
    to: '/vendedor/productos',
    icono: Package,
    capacidad: 'gestionarProductos',
    ambito: 'panel-vendedor',
  },
  {
    id: 'vendedor-pedidos',
    etiqueta: 'Pedidos',
    to: '/vendedor/pedidos',
    icono: ClipboardList,
    capacidad: 'gestionarPedidosVendedor',
    roles: ['vendedor'],
    ambito: 'panel-vendedor',
    badge: 'vendedor-pedidos',
  },
  {
    id: 'vendedor-cupones',
    etiqueta: 'Cupones',
    to: '/vendedor/cupones',
    icono: Ticket,
    capacidad: 'gestionarCupones',
    roles: ['vendedor'],
    ambito: 'panel-vendedor',
  },
  {
    id: 'vendedor-resenas',
    etiqueta: 'Reseñas',
    to: '/vendedor/resenas',
    icono: Star,
    capacidad: 'responderResenas',
    ambito: 'panel-vendedor',
  },
  {
    id: 'admin-resumen',
    etiqueta: 'Resumen',
    to: '/admin',
    icono: LayoutDashboard,
    capacidad: 'verPanelAdmin',
    ambito: 'panel-admin',
    fin: true,
  },
  {
    id: 'admin-verificaciones',
    etiqueta: 'Verificaciones',
    to: '/admin/verificaciones',
    icono: ShieldCheck,
    capacidad: 'gestionarVerificaciones',
    ambito: 'panel-admin',
    badge: 'admin-verificaciones',
  },
  {
    id: 'admin-pedidos',
    etiqueta: 'Pedidos',
    to: '/admin/pedidos',
    icono: ClipboardList,
    capacidad: 'gestionarPedidosVendedor',
    roles: ['administrador'],
    ambito: 'panel-admin',
    badge: 'admin-pedidos',
  },
  {
    id: 'admin-puestos',
    etiqueta: 'Puestos',
    to: '/admin/puestos',
    icono: Store,
    capacidad: 'moderarPuestos',
    ambito: 'panel-admin',
  },
  {
    id: 'admin-pagos',
    etiqueta: 'Pagos',
    to: '/admin/pagos',
    icono: CreditCard,
    capacidad: 'gestionarPagos',
    ambito: 'panel-admin',
  },
  {
    id: 'admin-cupones',
    etiqueta: 'Cupones',
    to: '/admin/cupones',
    icono: Percent,
    capacidad: 'gestionarCupones',
    roles: ['administrador'],
    ambito: 'panel-admin',
  },
  {
    id: 'admin-auditoria',
    etiqueta: 'Auditoría',
    to: '/admin/auditoria',
    icono: BookOpenCheck,
    capacidad: 'verAuditoria',
    ambito: 'panel-admin',
  },
];

/** Ítems visibles para un rol en un ámbito concreto (anónimo = rol nulo). */
export function menuParaRol(rol: Rol | null | undefined, ambito: AmbitoMenu): ItemMenu[] {
  return MENU.filter(
    (item) =>
      item.ambito === ambito &&
      puede(rol, item.capacidad) &&
      (!item.roles || (rol != null && item.roles.includes(rol))),
  );
}

/** Cabecera pública: catálogo + acceso al panel del rol (si aplica). */
export function menuCabecera(rol: Rol | null | undefined): ItemMenu[] {
  const panel = menuParaRol(rol, 'cuenta').filter((item) => item.id.startsWith('panel-'));
  return [...menuParaRol(rol, 'publico'), ...panel];
}

/** Enlaces laterales del panel que corresponde al rol. */
export function menuPanel(rol: Rol | null | undefined): ItemMenu[] {
  return [...menuParaRol(rol, 'panel-vendedor'), ...menuParaRol(rol, 'panel-admin')];
}

export function tituloPanel(rol: Rol | null | undefined): string {
  return rol === 'administrador' ? 'Administración' : 'Panel de vendedor';
}
