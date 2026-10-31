import { api } from '../lib/http';
import type { components } from '../lib/api-types';
import type { Paginado, Pago, PagoVendedor } from '../lib/types';

interface FiltrosPago {
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

export interface ResumenIngresos {
  pagos_aprobados: number;
  /** Neto que recibe el vendedor por sus pagos aprobados (decimal con 2 cifras). */
  ingresos_aprobados: string;
}

export async function obtenerResumenIngresos(): Promise<ResumenIngresos> {
  const { data } = await api.get<ResumenIngresos>('/payments/pagos/resumen/');
  return data;
}

export type VentasPanel = components['schemas']['VentasPanel'];
export type VentasDia = components['schemas']['VentasDia'];
export type VentasProducto = components['schemas']['VentasProducto'];
export type DiasVentas = 7 | 30 | 90;

/** Ventas (pagos aprobados) del periodo, agregadas en el servidor; ``puesto`` filtra por un puesto. */
export async function obtenerVentas(parametros: { dias: DiasVentas; puesto?: number | null }): Promise<VentasPanel> {
  const { data } = await api.get<VentasPanel>('/payments/ventas/', {
    params: { dias: parametros.dias, puesto: parametros.puesto ?? undefined },
  });
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
