import { api } from '../lib/http';
import type { Paginado, RegistroAuditoria } from '../lib/types';

interface FiltrosAuditoria {
  entidad?: string;
  accion?: string;
  usuario?: number | string;
  id_entidad?: number | string;
  desde?: string;
  hasta?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export async function listarAuditoria(filtros: FiltrosAuditoria = {}): Promise<Paginado<RegistroAuditoria>> {
  const { data } = await api.get<Paginado<RegistroAuditoria>>('/audit/registros/', { params: filtros });
  return data;
}
