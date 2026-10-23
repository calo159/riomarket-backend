import { api } from '../lib/http';
import type { Direccion, Paginado } from '../lib/types';

export interface DatosDireccion {
  alias: string;
  direccion: string;
  referencia?: string;
  latitud?: string | null;
  longitud?: string | null;
  es_predeterminada?: boolean;
  activa?: boolean;
}

export async function listarDirecciones(): Promise<Direccion[]> {
  const { data } = await api.get<Paginado<Direccion>>('/addresses/direcciones/', { params: { page_size: 100 } });
  return data.results;
}

export async function crearDireccion(datos: DatosDireccion): Promise<Direccion> {
  const { data } = await api.post<Direccion>('/addresses/direcciones/', datos);
  return data;
}

export async function actualizarDireccion(id: number, datos: Partial<DatosDireccion>): Promise<Direccion> {
  const { data } = await api.patch<Direccion>(`/addresses/direcciones/${id}/`, datos);
  return data;
}

export async function eliminarDireccion(id: number): Promise<void> {
  await api.delete(`/addresses/direcciones/${id}/`);
}

export async function predeterminarDireccion(id: number): Promise<Direccion> {
  const { data } = await api.post<Direccion>(`/addresses/direcciones/${id}/predeterminar/`, {});
  return data;
}
