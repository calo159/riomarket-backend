import type { Rol } from '../lib/types';

export type Capacidad =
  | 'verCatalogo'
  | 'comprar'
  | 'gestionarCarrito'
  | 'verMisPedidos'
  | 'gestionarDirecciones'
  | 'escribirResena'
  | 'verNotificaciones'
  | 'editarPerfil'
  | 'verPanelVendedor'
  | 'gestionarVerificacion'
  | 'gestionarPuestos'
  | 'gestionarProductos'
  | 'gestionarPedidosVendedor'
  | 'gestionarCupones'
  | 'responderResenas'
  | 'verPanelAdmin'
  | 'gestionarVerificaciones'
  | 'gestionarPagos'
  | 'verAuditoria'
  | 'moderarPuestos'
  | 'verUsuarios'
  | 'moderarProductos'
  | 'gestionarCategorias'
  | 'moderarResenas';

const CAPACIDADES_PUBLICAS: Capacidad[] = ['verCatalogo'];

const COMPRADOR: Capacidad[] = [
  ...CAPACIDADES_PUBLICAS,
  'comprar',
  'gestionarCarrito',
  'verMisPedidos',
  'gestionarDirecciones',
  'escribirResena',
  'verNotificaciones',
  'editarPerfil',
];

const VENDEDOR: Capacidad[] = [
  ...CAPACIDADES_PUBLICAS,
  'verPanelVendedor',
  'gestionarVerificacion',
  'gestionarPuestos',
  'gestionarProductos',
  'gestionarPedidosVendedor',
  'gestionarCupones',
  'responderResenas',
  'verNotificaciones',
  'editarPerfil',
];

const ADMINISTRADOR: Capacidad[] = [
  ...CAPACIDADES_PUBLICAS,
  'verPanelAdmin',
  'gestionarVerificaciones',
  'gestionarPagos',
  'verAuditoria',
  'moderarPuestos',
  'verUsuarios',
  'moderarProductos',
  'gestionarCategorias',
  'moderarResenas',
  'gestionarCupones',
  'gestionarPedidosVendedor',
  'verNotificaciones',
  'editarPerfil',
];

export const MATRIZ_PERMISOS: Record<Rol, Capacidad[]> = {
  comprador: COMPRADOR,
  vendedor: VENDEDOR,
  administrador: ADMINISTRADOR,
};

export function puede(rol: Rol | null | undefined, capacidad: Capacidad): boolean {
  if (!rol) return CAPACIDADES_PUBLICAS.includes(capacidad);
  return MATRIZ_PERMISOS[rol]?.includes(capacidad) ?? false;
}

export function inicioPorRol(rol: Rol | null | undefined): string {
  if (rol === 'vendedor') return '/vendedor';
  if (rol === 'administrador') return '/admin';
  return '/';
}
