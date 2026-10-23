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
