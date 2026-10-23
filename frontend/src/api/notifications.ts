import { api } from '../lib/http';
import type { Notificacion, Paginado } from '../lib/types';

export async function listarNotificaciones(params: { leida?: boolean; tipo?: string; page?: number; page_size?: number } = {}) {
  const { data } = await api.get<Paginado<Notificacion>>('/notifications/notificaciones/', { params });
  return data;
}

export async function contarNoLeidas(): Promise<number> {
  const { data } = await api.get<{ no_leidas: number }>('/notifications/notificaciones/contador/');
  return data.no_leidas;
}

export async function marcarLeida(id: number): Promise<Notificacion> {
  const { data } = await api.post<Notificacion>(`/notifications/notificaciones/${id}/leida/`, {});
  return data;
}

export async function marcarTodasLeidas(): Promise<number> {
  const { data } = await api.post<{ marcadas: number }>('/notifications/notificaciones/marcar-todas/', {});
  return data.marcadas;
}
