import { afterEach, describe, expect, it, vi } from 'vitest';
import { urlAbsoluta } from './utils';

describe('urlAbsoluta', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('usa el mismo origen cuando no hay VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(urlAbsoluta('/media/producto.png')).toBe('/media/producto.png');
  });

  it('antepone la URL base configurada', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/');
    expect(urlAbsoluta('/media/producto.png')).toBe('https://api.test/media/producto.png');
  });

  it('respeta las URLs absolutas y los valores vacíos', () => {
    expect(urlAbsoluta('https://cdn.test/producto.png')).toBe('https://cdn.test/producto.png');
    expect(urlAbsoluta(null)).toBeNull();
  });
});
