import { describe, expect, it } from 'vitest';
import { inicioPorRol } from './permisos';

describe('inicioPorRol', () => {
  it('lleva a cada rol a su pantalla de inicio', () => {
    expect(inicioPorRol('comprador')).toBe('/tienda');
    expect(inicioPorRol('vendedor')).toBe('/vendedor');
    expect(inicioPorRol('administrador')).toBe('/admin');
  });

  it('sin rol conocido manda a la tienda', () => {
    expect(inicioPorRol(null)).toBe('/tienda');
    expect(inicioPorRol(undefined)).toBe('/tienda');
  });
});
