import { api } from '../lib/http';
import type { Cupon, Paginado, RespuestaValidarCupon } from '../lib/types';

export interface FiltrosCupon {
  activo?: boolean | string;
  puesto?: number | string;
  tipo?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface DatosCupon {
  codigo: string;
  id_puesto: number | null;
  tipo_descuento: 'porcentaje' | 'monto';
  valor: string;
  monto_minimo_pedido?: string;
  tope_descuento?: string | null;
  usos_totales?: number | null;
  usos_por_usuario?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  activo?: boolean;
}

export async function listarCupones(filtros: FiltrosCupon = {}): Promise<Paginado<Cupon>> {
  const { data } = await api.get<Paginado<Cupon>>('/promotions/cupones/', { params: filtros });
  return data;
}

export async function crearCupon(datos: DatosCupon): Promise<Cupon> {
  const { data } = await api.post<Cupon>('/promotions/cupones/', datos);
  return data;
}

export async function actualizarCupon(id: number, datos: Partial<DatosCupon>): Promise<Cupon> {
  const { data } = await api.patch<Cupon>(`/promotions/cupones/${id}/`, datos);
  return data;
}

export async function eliminarCupon(id: number): Promise<void> {
  await api.delete(`/promotions/cupones/${id}/`);
}

export async function validarCupon(datos: { codigo: string; id_puesto: number; subtotal: string }): Promise<RespuestaValidarCupon> {
  const { data } = await api.post<RespuestaValidarCupon>('/promotions/cupones/validar/', datos);
  return data;
}
