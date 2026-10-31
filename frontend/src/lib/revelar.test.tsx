import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Revela } from '../components/Revela';

type Aviso = (entradas: { isIntersecting: boolean }[]) => void;

let aviso: Aviso | null = null;
const desconectar = vi.fn();

class ObservadorFalso {
  constructor(callback: Aviso) {
    aviso = callback;
  }
  observe = vi.fn();
  disconnect = desconectar;
}

function posicion(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
}

function menosMovimiento(reducir: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reducir }) as unknown as typeof window.matchMedia;
}

describe('Revela', () => {
  beforeEach(() => {
    aviso = null;
    desconectar.mockClear();
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
    menosMovimiento(false);
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('oculta lo que está debajo de la pantalla y lo muestra al llegar', () => {
    posicion(1600);
    const { container } = render(<Revela data-prueba="x">contenido</Revela>);
    const seccion = container.firstElementChild as HTMLElement;
    expect(seccion.dataset.revela).toBe('oculto');

    aviso?.([{ isIntersecting: false }]);
    expect(seccion.dataset.revela).toBe('oculto');

    aviso?.([{ isIntersecting: true }]);
    expect(seccion.dataset.revela).toBe('visto');
    expect(desconectar).toHaveBeenCalled();
  });

  it('no oculta lo que ya está a la vista', () => {
    posicion(100);
    const { container } = render(<Revela>contenido</Revela>);
    expect((container.firstElementChild as HTMLElement).dataset.revela).toBeUndefined();
  });

  it('no oculta nada si la persona pidió menos movimiento', () => {
    posicion(1600);
    menosMovimiento(true);
    const { container } = render(<Revela>contenido</Revela>);
    expect((container.firstElementChild as HTMLElement).dataset.revela).toBeUndefined();
  });

  it('no oculta nada si el navegador no sabe observar', () => {
    posicion(1600);
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Revela>contenido</Revela>);
    expect((container.firstElementChild as HTMLElement).dataset.revela).toBeUndefined();
  });

  it('deja de observar al desmontarse', () => {
    posicion(1600);
    const { unmount } = render(<Revela>contenido</Revela>);
    unmount();
    expect(desconectar).toHaveBeenCalled();
  });
});
