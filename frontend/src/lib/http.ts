import axios, { type AxiosAdapter, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { limpiarRefresh } from '../auth/tokens';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _reintentada?: boolean;
  }
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const RUTAS_SIN_REFRESH = ['/auth/login/', '/auth/registro/', '/auth/token/refresh/', '/auth/token/verify/'];

interface OpcionesHttp {
  baseURL: string;
  obtenerAccess: () => string | null;
  /** @deprecated El refresh viaja en cookie HttpOnly; se mantiene por compatibilidad. */
  obtenerRefresh?: () => string | null;
  guardarAccess: (token: string) => void;
  /** @deprecated El refresh viaja en cookie HttpOnly; se mantiene por compatibilidad. */
  guardarRefreshToken?: (token: string) => void;
  alPerderSesion: () => void;
  clienteRefresh?: AxiosInstance;
  adaptadorApi?: AxiosAdapter;
}

export interface ClienteHttp {
  api: AxiosInstance;
  refrescar: () => Promise<string>;
}

export function crearClienteHttp(opciones: OpcionesHttp): ClienteHttp {
  const { baseURL, obtenerAccess, guardarAccess } = opciones;
  const api = axios.create({
    baseURL,
    timeout: 20000,
    withCredentials: true,
    ...(opciones.adaptadorApi ? { adapter: opciones.adaptadorApi } : {}),
  });
  const clienteRefresh =
    opciones.clienteRefresh ??
    axios.create({
      baseURL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

  let promesaRefresh: Promise<string> | null = null;

  async function refrescar(): Promise<string> {
    if (promesaRefresh) return promesaRefresh;

    promesaRefresh = clienteRefresh
      .post<{ access: string; refresh?: string }>(
        '/auth/token/refresh/',
        {},
        { headers: { 'X-Requested-With': 'XMLHttpRequest' }, withCredentials: true },
      )
      .then((respuesta) => {
        guardarAccess(respuesta.data.access);
        if (respuesta.data.refresh) opciones.guardarRefreshToken?.(respuesta.data.refresh);
        return respuesta.data.access;
      })
      .finally(() => {
        promesaRefresh = null;
      });

    return promesaRefresh;
  }

  api.interceptors.request.use((config) => {
    const access = obtenerAccess();
    if (access) config.headers.Authorization = `Bearer ${access}`;
    if (config.method && config.method.toLowerCase() !== 'get' && config.method.toLowerCase() !== 'head') {
      config.headers = config.headers ?? {};
      if (!config.headers['X-Requested-With'] && !config.headers['x-requested-with']) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
      }
    }
    config.withCredentials = true;
    return config;
  });

  api.interceptors.response.use(
    (respuesta) => respuesta,
    async (error) => {
      const original = error.config as InternalAxiosRequestConfig | undefined;
      const es401 = error.response?.status === 401;
      const url = original?.url ?? '';
      const sinRefresh = RUTAS_SIN_REFRESH.some((ruta) => url.includes(ruta));

      if (!original || !es401 || original._reintentada || sinRefresh) {
        throw error;
      }

      original._reintentada = true;
      try {
        const access = await refrescar();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${access}`;
        original.headers['X-Requested-With'] = original.headers['X-Requested-With'] || 'XMLHttpRequest';
        original.withCredentials = true;
        return api(original);
      } catch (errorRefresh) {
        limpiarRefresh();
        opciones.alPerderSesion();
        throw errorRefresh;
      }
    },
  );

  return { api, refrescar };
}

let accessEnMemoria: string | null = null;
let manejadorPerdidaSesion: (() => void) | null = null;

const clienteGlobal = crearClienteHttp({
  baseURL: `${API_BASE}/api`,
  obtenerAccess: () => accessEnMemoria,
  guardarAccess: (token) => {
    accessEnMemoria = token;
  },
  alPerderSesion: () => manejadorPerdidaSesion?.(),
});

export const api = clienteGlobal.api;
export const refreshAccessToken = clienteGlobal.refrescar;

export function setAccessToken(token: string | null): void {
  accessEnMemoria = token;
}

export function getAccessToken(): string | null {
  return accessEnMemoria;
}

export function setSessionLostHandler(handler: (() => void) | null): void {
  manejadorPerdidaSesion = handler;
}
