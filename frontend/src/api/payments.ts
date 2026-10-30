import { api } from '../lib/http';
import type { Paginado, Pago, PagoVendedor } from '../lib/types';

export interface FiltrosPago {
  estado?: string;
  por_confirmar?: boolean | string;
  metodo_pago?: string;
  pedido?: number | string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export async function listarPagos(filtros: FiltrosPago = {}): Promise<Paginado<PagoVendedor>> {
  const { data } = await api.get<Paginado<PagoVendedor>>('/payments/pagos/', { params: filtros });
  return data;
}

export async function crearPago(datos: { pedido: number; metodo_pago: string; notas?: string }): Promise<Pago> {
  const { data } = await api.post<Pago>('/payments/pagos/', datos);
  return data;
}

export async function simularPago(id: number, accion: 'aprobar' | 'rechazar' = 'aprobar'): Promise<Pago> {
  const { data } = await api.post<Pago>(`/payments/pagos/${id}/simular/`, { accion });
  return data;
}

export async function confirmarEfectivo(id: number, notas?: string): Promise<Pago> {
  const { data } = await api.post<Pago>(`/payments/pagos/${id}/confirmar-efectivo/`, { notas });
  return data;
}

export async function reembolsarPago(id: number, notas?: string): Promise<Pago> {
  const { data } = await api.post<Pago>(`/payments/pagos/${id}/reembolsar/`, { notas });
  return data;
}

export async function anularPago(id: number, notas?: string): Promise<Pago> {
  const { data } = await api.post<Pago>(`/payments/pagos/${id}/anular/`, { notas });
  return data;
}
