import { api } from '../lib/http';

export interface ConfiguracionPublica {
  /** Tarifa de domicilio vigente, la misma que cobra el servidor (`"3000.00"`). */
  tarifa_domicilio: string;
}

export async function obtenerConfiguracionPublica(): Promise<ConfiguracionPublica> {
  const { data } = await api.get<ConfiguracionPublica>('/configuracion/publica/');
  return data;
}
