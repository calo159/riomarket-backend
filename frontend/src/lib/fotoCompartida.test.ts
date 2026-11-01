import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abrirConFotoCompartida, FOTO_COMPARTIDA } from './fotoCompartida';

function ponerTransicion(valor: unknown) {
  Object.defineProperty(document, 'startViewTransition', { value: valor, configurable: true, writable: true });
}
function quitarTransicion() {
  Reflect.deleteProperty(document, 'startViewTransition');
}

function menosMovimiento(reducir: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reducir }) as unknown as typeof window.matchMedia;
}

describe('abrirConFotoCompartida', () => {
  beforeEach(() => {
    menosMovimiento(false);
    document.body.innerHTML = '';
  });
  afterEach(() => {
    quitarTransicion();
  });

  it('no hace nada si el navegador no soporta transiciones de vista', () => {
    const navegar = vi.fn();
    const foto = document.createElement('a');
    expect(abrirConFotoCompartida(foto, navegar)).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(foto.style.viewTransitionName).toBe('');
  });

  it('no hace nada si la persona pidió menos movimiento', () => {
    const espia = vi.fn();
    ponerTransicion(espia);
    menosMovimiento(true);
    expect(abrirConFotoCompartida(document.createElement('a'), vi.fn())).toBe(false);
    expect(espia).not.toHaveBeenCalled();
  });

  it('no hace nada si no hay foto de origen', () => {
    ponerTransicion(vi.fn());
    expect(abrirConFotoCompartida(null, vi.fn())).toBe(false);
  });

  it('nombra la foto, navega y le quita el nombre al terminar el viaje', async () => {
    const destino = document.createElement('div');
    destino.dataset.vt = FOTO_COMPARTIDA;
    document.body.append(destino);
    let nombreDuranteElViaje = '';
    let terminar!: () => void;
    const finished = new Promise<void>((resolver) => (terminar = resolver));
    const foto = document.createElement('a');
    ponerTransicion(
      vi.fn((actualizar: () => Promise<void>) => {
        nombreDuranteElViaje = foto.style.viewTransitionName;
        void actualizar();
        return { finished };
      }),
    );
    const navegar = vi.fn();

    expect(abrirConFotoCompartida(foto, navegar)).toBe(true);
    expect(nombreDuranteElViaje).toBe(FOTO_COMPARTIDA);
    expect(navegar).toHaveBeenCalledOnce();

    terminar();
    await finished;
    await Promise.resolve();
    expect(foto.style.viewTransitionName).toBe('');
  });
});
