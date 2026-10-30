import { afterEach, describe, expect, it, vi } from 'vitest';
import { registrarServiceWorker } from './registrarServiceWorker';

function simularNavegador(register: () => Promise<unknown>) {
  Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
}

describe('registrarServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('no registra nada fuera de producción', () => {
    const register = vi.fn().mockResolvedValue({});
    simularNavegador(register);
    vi.stubEnv('PROD', false);
    registrarServiceWorker();
    window.dispatchEvent(new Event('load'));
    expect(register).not.toHaveBeenCalled();
  });

  it('en producción registra /sw.js con alcance raíz al cargar la página', () => {
    const register = vi.fn().mockResolvedValue({});
    simularNavegador(register);
    vi.stubEnv('PROD', true);
    registrarServiceWorker();
    window.dispatchEvent(new Event('load'));
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('si el registro falla o lanza, la aplicación no se entera', () => {
    vi.stubEnv('PROD', true);
    simularNavegador(() => Promise.reject(new Error('bloqueado')));
    expect(() => {
      registrarServiceWorker();
      window.dispatchEvent(new Event('load'));
    }).not.toThrow();
    simularNavegador(() => {
      throw new Error('sin permiso');
    });
    expect(() => {
      registrarServiceWorker();
      window.dispatchEvent(new Event('load'));
    }).not.toThrow();
  });
});
