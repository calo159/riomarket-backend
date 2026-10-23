import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { crearClienteHttp } from './http';

function respuesta(config: InternalAxiosRequestConfig, data: unknown) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  };
}

function error401(config: InternalAxiosRequestConfig) {
  return new AxiosError('No autorizado', 'ERR_BAD_REQUEST', config, undefined, {
    data: {},
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });
}

function crearClientePrueba(adaptadorApi: AxiosAdapter, adaptadorRefresh: AxiosAdapter) {
  let access: string | null = 'access-viejo';
  const refreshGuardados: string[] = [];
  const refrescos = { llamadas: 0 };
  const perdidas = vi.fn();

  const cliente = crearClienteHttp({
    baseURL: '/api',
    obtenerAccess: () => access,
    obtenerRefresh: () => 'refresh-viejo',
    guardarAccess: (token) => {
      access = token;
    },
    guardarRefreshToken: (token) => refreshGuardados.push(token),
    alPerderSesion: perdidas,
    adaptadorApi,
    clienteRefresh: axios.create({
      adapter: async (config) => {
        refrescos.llamadas += 1;
        return adaptadorRefresh(config);
      },
    }),
  });

  return { cliente, refrescos, refreshGuardados, perdidas, access: () => access };
}

describe('cliente HTTP', () => {
  it('comparte un solo refresh entre peticiones simultáneas que reciben 401', async () => {
    const adaptadorApi: AxiosAdapter = async (config) => {
      if (config.headers.Authorization !== 'Bearer access-nuevo') throw error401(config);
      return respuesta(config, { ruta: config.url });
    };
    const adaptadorRefresh: AxiosAdapter = async (config) => {
      await new Promise((resolver) => setTimeout(resolver, 15));
      return respuesta(config, { access: 'access-nuevo', refresh: 'refresh-nuevo' });
    };

    const { cliente, refrescos, refreshGuardados, access } = crearClientePrueba(adaptadorApi, adaptadorRefresh);

    const [primera, segunda] = await Promise.all([
      cliente.api.get('/orders/pedidos/'),
      cliente.api.get('/notifications/'),
    ]);

    expect(primera.data).toEqual({ ruta: '/orders/pedidos/' });
    expect(segunda.data).toEqual({ ruta: '/notifications/' });
    expect(refrescos.llamadas).toBe(1);
    expect(access()).toBe('access-nuevo');
    expect(refreshGuardados).toEqual(['refresh-nuevo']);
  });

  it('reintenta una sola vez y pierde la sesión si el refresh falla', async () => {
    const adaptadorApi: AxiosAdapter = async (config) => {
      throw error401(config);
    };
    const adaptadorRefresh: AxiosAdapter = async () => {
      throw new Error('refresh inválido');
    };

    const { cliente, refrescos, perdidas } = crearClientePrueba(adaptadorApi, adaptadorRefresh);

    await expect(cliente.api.get('/orders/pedidos/')).rejects.toThrow('refresh inválido');
    expect(refrescos.llamadas).toBe(1);
    expect(perdidas).toHaveBeenCalledTimes(1);
  });

  it('no intenta refrescar en las rutas de autenticación', async () => {
    const adaptadorApi: AxiosAdapter = async (config) => {
      throw error401(config);
    };
    const adaptadorRefresh: AxiosAdapter = async (config) => respuesta(config, { access: 'no-deberia' });

    const { cliente, refrescos, perdidas } = crearClientePrueba(adaptadorApi, adaptadorRefresh);

    await expect(cliente.api.post('/auth/login/', {})).rejects.toBeInstanceOf(AxiosError);
    expect(refrescos.llamadas).toBe(0);
    expect(perdidas).not.toHaveBeenCalled();
  });

  it('no entra en bucle si la petición reintentada vuelve a responder 401', async () => {
    const adaptadorApi: AxiosAdapter = async (config) => {
      throw error401(config);
    };
    const adaptadorRefresh: AxiosAdapter = async (config) => respuesta(config, { access: 'access-nuevo' });

    const { cliente, refrescos, perdidas } = crearClientePrueba(adaptadorApi, adaptadorRefresh);

    await expect(cliente.api.get('/orders/pedidos/')).rejects.toBeInstanceOf(AxiosError);
    expect(refrescos.llamadas).toBe(1);
    expect(perdidas).not.toHaveBeenCalled();
  });
});
