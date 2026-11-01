import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { esErrorTemporal, mensajeDeCarga } from './errors';

const NO_EXISTE = 'No encontramos este producto.';

function conEstado(status: number) {
  return new AxiosError('fallo', 'ERR_BAD_RESPONSE', undefined, undefined, { status, data: {} } as AxiosResponse);
}
const sinRespuesta = () => new AxiosError('Network Error', 'ERR_NETWORK');

describe('mensajeDeCarga', () => {
  it('un 404 o un 403 se muestra como «no existe»', () => {
    expect(mensajeDeCarga(conEstado(404), NO_EXISTE)).toBe(NO_EXISTE);
    expect(mensajeDeCarga(conEstado(403), NO_EXISTE)).toBe(NO_EXISTE);
  });

  it('un 429 pide esperar, sin decir que el producto no existe', () => {
    const texto = mensajeDeCarga(conEstado(429), NO_EXISTE);
    expect(texto).toMatch(/Espera unos segundos/);
    expect(texto).not.toMatch(/No encontramos/);
  });

  it('un error del servidor y la falta de conexión tienen su propio texto', () => {
    expect(mensajeDeCarga(conEstado(500), NO_EXISTE)).toMatch(/problema/);
    expect(mensajeDeCarga(sinRespuesta(), NO_EXISTE)).toMatch(/conectar/);
  });

  it('lo que no es un error de red conserva el texto de «no existe»', () => {
    expect(mensajeDeCarga(null, NO_EXISTE)).toBe(NO_EXISTE);
    expect(mensajeDeCarga(new Error('x'), NO_EXISTE)).toBe(NO_EXISTE);
  });
});

describe('esErrorTemporal', () => {
  it('reintentar sirve con 429, 5xx y sin conexión, no con 404 ni 403', () => {
    expect(esErrorTemporal(conEstado(429))).toBe(true);
    expect(esErrorTemporal(conEstado(503))).toBe(true);
    expect(esErrorTemporal(sinRespuesta())).toBe(true);
    expect(esErrorTemporal(conEstado(404))).toBe(false);
    expect(esErrorTemporal(conEstado(403))).toBe(false);
    expect(esErrorTemporal(null)).toBe(false);
  });
});
