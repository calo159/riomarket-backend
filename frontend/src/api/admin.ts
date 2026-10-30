import { api } from '../lib/http';
import type { Paginado, Rol } from '../lib/types';

export type AccionUsuario = 'cambiar-rol' | 'suspender' | 'reactivar';
export type EstadoUsuario = 'activo' | 'suspendido';

export interface PuestoResumenUsuario {
  id: number;
  nombre: string;
  estado: string;
}

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  celular: string;
  rol: Rol;
  estado: EstadoUsuario;
  fecha_registro: string;
  estado_verificacion: string | null;
  pedidos_como_comprador: number;
  pedidos_activos: number;
  puestos: PuestoResumenUsuario[];
  acciones_permitidas: AccionUsuario[];
}

export interface FiltrosUsuario {
  rol?: string;
  estado?: string;
  q?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ResumenAdmin {
  usuarios: {
    total: number;
    activos: number;
    suspendidos: number;
    por_rol: Record<string, number>;
  };
  pedidos: {
    total: number;
    por_estado: Record<string, number>;
    activos: number;
    con_no_recibido: number;
  };
  pagos: {
    total: number;
    por_confirmar: number;
    total_vendido: string;
    comision: string;
  };
  verificaciones_pendientes: number;
  puestos: { total: number; por_estado: Record<string, number> };
  productos: { total: number; por_estado: Record<string, number>; bloqueados: number };
  resenas: { total: number; ocultas: number };
  cupones: { total: number; activos: number };
  generado_en: string;
}

export async function listarUsuarios(filtros: FiltrosUsuario = {}): Promise<Paginado<UsuarioAdmin>> {
  const { data } = await api.get<Paginado<UsuarioAdmin>>('/admin/usuarios/', { params: filtros });
  return data;
}

export async function cambiarRolUsuario(
  id: number,
  datos: { rol: Rol; motivo: string },
): Promise<UsuarioAdmin> {
  const { data } = await api.post<UsuarioAdmin>(`/admin/usuarios/${id}/cambiar-rol/`, datos);
  return data;
}

export async function suspenderUsuario(id: number, motivo: string): Promise<UsuarioAdmin> {
  const { data } = await api.post<UsuarioAdmin>(`/admin/usuarios/${id}/suspender/`, { motivo });
  return data;
}

export async function reactivarUsuario(id: number): Promise<UsuarioAdmin> {
  const { data } = await api.post<UsuarioAdmin>(`/admin/usuarios/${id}/reactivar/`, {});
  return data;
}

export async function obtenerResumenAdmin(): Promise<ResumenAdmin> {
  const { data } = await api.get<ResumenAdmin>('/admin/resumen/');
  return data;
}

export async function moderarPuesto(
  id: number,
  datos: { estado: 'activo' | 'inactivo' | 'suspendido'; motivo?: string },
): Promise<void> {
  await api.post(`/catalog/puestos/${id}/moderar/`, datos);
}

export async function moderarProducto(
  id: number,
  datos: { estado: 'activo' | 'bloqueado'; motivo?: string },
): Promise<void> {
  await api.post(`/catalog/productos/${id}/moderar/`, datos);
}
