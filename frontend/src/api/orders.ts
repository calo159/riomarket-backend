import { api } from '../lib/http';
import type { Paginado, Pedido } from '../lib/types';

interface FiltrosPedido {
  estado?: string;
  tipo_entrega?: string;
  puesto?: number | string;
  con_no_recibido?: boolean | string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface DatosPedido {
  id_puesto: number;
  tipo_entrega: 'retiro' | 'domicilio';
  direccion_entrega?: string;
  referencia_entrega?: string;
  id_direccion?: number | null;
  notas?: string;
  items: { id_producto: number; cantidad: number }[];
  codigo_cupon?: string;
}

export async function listarPedidos(filtros: FiltrosPedido = {}): Promise<Paginado<Pedido>> {
  const { data } = await api.get<Paginado<Pedido>>('/orders/pedidos/', { params: filtros });
  return data;
}

export async function obtenerPedido(id: number | string): Promise<Pedido> {
  const { data } = await api.get<Pedido>(`/orders/pedidos/${id}/`);
  return data;
}

export async function crearPedido(datos: DatosPedido): Promise<Pedido> {
  const { data } = await api.post<Pedido>('/orders/pedidos/', datos);
  return data;
}

export type AccionPedido =
  | 'confirmar'
  | 'en-preparacion'
  | 'enviar'
  | 'entregar'
  | 'cancelar';

export async function ejecutarAccionPedido(id: number, accion: AccionPedido): Promise<Pedido> {
  const { data } = await api.post<Pedido>(`/orders/pedidos/${id}/${accion}/`, {});
  return data;
}

export async function reportarNoRecibido(id: number, motivo?: string): Promise<Pedido> {
  const { data } = await api.post<Pedido>(`/orders/pedidos/${id}/no-recibido/`, {
    motivo: motivo?.trim() || undefined,
  });
  return data;
}
