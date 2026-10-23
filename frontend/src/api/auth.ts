import { api } from '../lib/http';
import type { Perfil, Rol, UsuarioSesion } from '../lib/types';

export interface DatosRegistro {
  nombre: string;
  correo: string;
  celular: string;
  rol: Extract<Rol, 'comprador' | 'vendedor'>;
  password: string;
}

export async function registrarUsuario(datos: DatosRegistro): Promise<UsuarioSesion> {
  const { data } = await api.post<UsuarioSesion>('/auth/registro/', datos);
  return data;
}

export async function obtenerPerfil(): Promise<Perfil> {
  const { data } = await api.get<Perfil>('/auth/perfil/');
  return data;
}

export async function actualizarPerfil(datos: { nombre?: string; correo?: string; celular?: string }): Promise<Perfil> {
  const { data } = await api.patch<Perfil>('/auth/perfil/', datos);
  return data;
}
