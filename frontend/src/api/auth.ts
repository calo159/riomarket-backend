import { api } from '../lib/http';
import type { Perfil, Rol, UsuarioSesion } from '../lib/types';

interface DatosRegistro {
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

export async function solicitarRecuperacion(correo: string): Promise<void> {
  await api.post('/auth/recuperar-contrasena/', { correo });
}

export async function restablecerContrasena(datos: { token: string; nueva: string }): Promise<void> {
  await api.post('/auth/restablecer-contrasena/', datos);
}

export async function cambiarContrasena(datos: { actual: string; nueva: string }): Promise<void> {
  await api.post('/auth/perfil/cambiar-contrasena/', datos);
}
