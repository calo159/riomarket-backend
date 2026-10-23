import { api } from '../lib/http';
import type { MiVerificacion, Paginado, VerificacionAdminList } from '../lib/types';

export async function miVerificacion(): Promise<MiVerificacion | null> {
  const { data } = await api.get<MiVerificacion | null>('/verificacion/mi-verificacion/');
  return data?.id ? data : null;
}

export async function enviarVerificacion(numeroCedula: string, foto: File): Promise<MiVerificacion> {
  const formulario = new FormData();
  formulario.append('numero_cedula', numeroCedula);
  formulario.append('foto_cedula', foto);
  const { data } = await api.post<MiVerificacion>('/verificacion/mi-verificacion/', formulario);
  return data;
}

export async function listarSolicitudes(estado?: string): Promise<Paginado<VerificacionAdminList>> {
  const { data } = await api.get<Paginado<VerificacionAdminList>>('/verificacion/solicitudes/', {
    params: { estado, page_size: 100 },
  });
  return data;
}

export async function decidirSolicitud(
  id: number,
  datos: { estado: 'aprobado' | 'rechazado'; motivo_rechazo?: string },
): Promise<VerificacionAdminList> {
  const { data } = await api.patch<VerificacionAdminList>(`/verificacion/solicitudes/${id}/`, datos);
  return data;
}

export async function obtenerFotoCedula(id: number): Promise<Blob> {
  const { data } = await api.get(`/verificacion/solicitudes/${id}/cedula/`, { responseType: 'blob' });
  return data as Blob;
}
