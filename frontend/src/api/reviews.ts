import { api } from '../lib/http';
import type { Paginado, Resena } from '../lib/types';

export interface FiltrosResena {
  puesto?: number | string;
  vendedor?: number | string;
  calificacion_min?: number;
  calificacion_max?: number;
  con_respuesta?: boolean | string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export async function listarResenas(filtros: FiltrosResena = {}): Promise<Paginado<Resena>> {
  const { data } = await api.get<Paginado<Resena>>('/reviews/resenas/', { params: filtros });
  return data;
}

export async function crearResena(datos: {
  id_puesto: number;
  id_pedido?: number | null;
  calificacion: number;
  comentario?: string;
}): Promise<Resena> {
  const { data } = await api.post<Resena>('/reviews/resenas/', datos);
  return data;
}

export async function eliminarResena(id: number): Promise<void> {
  await api.delete(`/reviews/resenas/${id}/`);
}

export async function responderResena(id: number, respuesta: string): Promise<Resena> {
  const { data } = await api.post<Resena>(`/reviews/resenas/${id}/responder/`, { respuesta });
  return data;
}
