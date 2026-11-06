import { api } from '../lib/http';
import type { Sitio } from '../lib/sitio';

export async function obtenerSitio(): Promise<Sitio> {
  const { data } = await api.get<Sitio>('/configuracion/sitio/');
  return data;
}

export type TipoCampoSitio = 'texto' | 'parrafo' | 'correo' | 'url' | 'telefono' | 'paleta';

export interface CampoPersonalizacion {
  clave: keyof Omit<Sitio, 'color_tema'>;
  etiqueta: string;
  ayuda: string;
  tipo: TipoCampoSitio;
  largo: number;
  /** Lo que rige ahora: el propio o, si no hay, el de por defecto. */
  valor: string;
  /** Lo que escribió el administrador ("" si no ha cambiado nada). */
  propio: string;
  defecto: string;
  /** El de por defecto con `{ciudad}` y `{nombre_marca}` sin reemplazar (para la vista previa). */
  plantilla: string;
  personalizado: boolean;
}

export interface PersonalizacionAdmin {
  grupos: { nombre: string; campos: CampoPersonalizacion[] }[];
  paletas: { clave: string; etiqueta: string; color: string }[];
  actualizado: string | null;
}

export async function obtenerPersonalizacion(): Promise<PersonalizacionAdmin> {
  const { data } = await api.get<PersonalizacionAdmin>('/admin/personalizacion/');
  return data;
}

/** Solo van los campos que cambian; vacío o `null` borra el valor propio y vuelve el de por defecto. */
export async function guardarPersonalizacion(valores: Record<string, string | null>): Promise<PersonalizacionAdmin> {
  const { data } = await api.put<PersonalizacionAdmin>('/admin/personalizacion/', { valores });
  return data;
}
