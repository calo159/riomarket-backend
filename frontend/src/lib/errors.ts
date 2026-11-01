import axios from 'axios';
import type { ErrorApi } from './types';

function extraerErrores(data: unknown): Record<string, string[]> {
  if (!data || typeof data !== 'object') return {};
  const cuerpo = data as ErrorApi;
  const crudo = cuerpo.errors;
  const resultado: Record<string, string[]> = {};

  if (typeof crudo === 'string') {
    resultado.__general = [crudo];
    return resultado;
  }
  if (Array.isArray(crudo)) {
    resultado.__general = crudo.map(String);
    return resultado;
  }
  if (crudo && typeof crudo === 'object') {
    for (const [campo, valor] of Object.entries(crudo)) {
      if (Array.isArray(valor)) resultado[campo] = valor.map(String);
      else if (typeof valor === 'string') resultado[campo] = [valor];
      else if (valor && typeof valor === 'object') {
        const anidados = Object.values(valor as Record<string, unknown>)
          .flat()
          .map(String);
        if (anidados.length) resultado[campo] = anidados;
      }
    }
  }
  if (cuerpo.detail && !resultado.__general) resultado.__general = [cuerpo.detail];
  return resultado;
}

export function erroresDeCampo(error: unknown): Record<string, string[]> {
  if (!axios.isAxiosError(error)) return {};
  return extraerErrores(error.response?.data);
}

export function mensajeDeError(error: unknown, porDefecto = 'Ocurrió un error. Intenta de nuevo.'): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : porDefecto;
  }
  if (!error.response) {
    return 'No pudimos conectar con RioMarket. Verifica que el backend esté encendido.';
  }
  const campos = erroresDeCampo(error);
  const todos = Object.values(campos).flat();
  if (todos.length) return todos[0];
  const data = error.response.data as ErrorApi | undefined;
  if (typeof data?.detail === 'string') return data.detail;
  if (error.response.status === 403) return 'No tienes permisos para realizar esta acción.';
  if (error.response.status === 404) return 'No encontramos ese recurso.';
  return porDefecto;
}

/** Fallos que pasan solos: sin conexión, demasiadas consultas seguidas (429) o un error del servidor. */
export function esErrorTemporal(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return error.response.status === 429 || error.response.status >= 500;
}

/** Texto de una página que no pudo cargar: separa «no existe» de «vas muy rápido» y «sin conexión». */
export function mensajeDeCarga(error: unknown, noEncontrado: string): string {
  if (!axios.isAxiosError(error)) return noEncontrado;
  if (!error.response) return 'No pudimos conectar con RioMarket. Revisa tu conexión e inténtalo de nuevo.';
  if (error.response.status === 429) {
    return 'Hiciste muchas consultas seguidas. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error.response.status >= 500) return 'RioMarket tuvo un problema al cargar esto. Inténtalo de nuevo en un momento.';
  return noEncontrado;
}
