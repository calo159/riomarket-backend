import { api } from '../lib/http';
import { crearPago } from './payments';
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

/**
 * Crea el pedido y, si es de retiro, registra el pago en efectivo (se paga en el puesto al
 * recoger). Si el pago falla, el pedido ya existe: se devuelve igual y en su detalle sigue
 * disponible «Pagar pedido».
 */
export async function crearPedidoConPagoAlRecoger(datos: DatosPedido): Promise<Pedido> {
  const pedido = await crearPedido(datos);
  if (datos.tipo_entrega === 'retiro') {
    try {
      await crearPago({ pedido: pedido.id, metodo_pago: 'efectivo' });
    } catch {
      // El comprador podrá pagar desde el detalle del pedido.
    }
  }
  return pedido;
}

export type AccionPedido =
  | 'confirmar'
  | 'en-preparacion'
  | 'enviar'
  | 'listo-para-recoger'
  | 'entregar'
  | 'cancelar'
  | 'extender-plazo';

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
