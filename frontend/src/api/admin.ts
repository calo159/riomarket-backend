import { api } from '../lib/http';
import type { Paginado, Rol } from '../lib/types';

type AccionUsuario = 'cambiar-rol' | 'roles' | 'suspender' | 'reactivar';
type EstadoUsuario = 'activo' | 'suspendido';

interface RolAsignado {
  id: number;
  nombre: string;
  es_sistema: boolean;
}

interface PuestoResumenUsuario {
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
  roles_asignados: RolAsignado[];
  acciones_permitidas: AccionUsuario[];
}

interface FiltrosUsuario {
  rol?: string;
  estado?: string;
  rol_asignado?: number;
  q?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

interface ResumenAdmin {
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

export async function asignarRolesUsuario(
  id: number,
  datos: { roles: number[]; motivo: string },
): Promise<UsuarioAdmin> {
  const { data } = await api.put<UsuarioAdmin>(`/admin/usuarios/${id}/roles/`, datos);
  return data;
}

// ---------------------------------------------------------------- Roles
export interface RolAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  es_sistema: boolean;
  total_usuarios: number;
  total_recursos: number;
  recursos: number[];
}

export async function listarRoles(): Promise<RolAdmin[]> {
  const { data } = await api.get<Paginado<RolAdmin>>('/admin/roles/', { params: { page_size: 100 } });
  return data.results;
}

export async function crearRol(datos: Pick<RolAdmin, 'nombre' | 'descripcion' | 'activo'>): Promise<RolAdmin> {
  const { data } = await api.post<RolAdmin>('/admin/roles/', datos);
  return data;
}

export async function actualizarRol(
  id: number,
  datos: Partial<Pick<RolAdmin, 'nombre' | 'descripcion' | 'activo'>>,
): Promise<RolAdmin> {
  const { data } = await api.patch<RolAdmin>(`/admin/roles/${id}/`, datos);
  return data;
}

export async function eliminarRol(id: number): Promise<void> {
  await api.delete(`/admin/roles/${id}/`);
}

export async function fijarRecursosRol(
  id: number,
  datos: { recursos: number[]; motivo: string },
): Promise<RolAdmin> {
  const { data } = await api.put<RolAdmin>(`/admin/roles/${id}/recursos/`, datos);
  return data;
}

// ------------------------------------------------------------ Recursos
export type AmbitoRecurso = 'publico' | 'cuenta' | 'panel_vendedor' | 'panel_admin';

export interface RecursoAdmin {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  ambito: AmbitoRecurso;
  ruta: string;
  icono: string;
  grupo: string;
  orden: number;
  es_publico: boolean;
  es_sistema: boolean;
  activo: boolean;
  total_roles: number;
}

export type DatosRecurso = Omit<RecursoAdmin, 'id' | 'es_sistema' | 'total_roles'>;

interface FiltrosRecurso {
  ambito?: string;
  activo?: string;
  q?: string;
}

export async function listarRecursos(filtros: FiltrosRecurso = {}): Promise<RecursoAdmin[]> {
  const { data } = await api.get<Paginado<RecursoAdmin>>('/admin/recursos/', {
    params: { ...filtros, page_size: 100 },
  });
  return data.results;
}

export async function crearRecurso(datos: DatosRecurso): Promise<RecursoAdmin> {
  const { data } = await api.post<RecursoAdmin>('/admin/recursos/', datos);
  return data;
}

export async function actualizarRecurso(id: number, datos: Partial<DatosRecurso>): Promise<RecursoAdmin> {
  const { data } = await api.patch<RecursoAdmin>(`/admin/recursos/${id}/`, datos);
  return data;
}

export async function eliminarRecurso(id: number): Promise<{ roles_afectados: number }> {
  const { data } = await api.delete<{ roles_afectados: number }>(`/admin/recursos/${id}/`);
  return data;
}

export const ETIQUETAS_AMBITO: Record<AmbitoRecurso, string> = {
  publico: 'Público',
  cuenta: 'Cuenta',
  panel_vendedor: 'Panel de vendedor',
  panel_admin: 'Panel de administración',
};

/** Recursos que el rol «administrador» nunca puede perder (candado anti-bloqueo). */
export const RECURSOS_OBLIGATORIOS_ADMIN = ['admin.usuarios', 'admin.roles', 'admin.recursos', 'admin.resumen'];
