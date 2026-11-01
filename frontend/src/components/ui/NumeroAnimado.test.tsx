import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NumeroAnimado } from './NumeroAnimado';

function menosMovimiento(reducir: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reducir }) as unknown as typeof window.matchMedia;
}

describe('NumeroAnimado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('cuenta desde cero hasta el valor y se queda en el valor exacto', () => {
    menosMovimiento(false);
    const { container } = render(<NumeroAnimado texto="$ 582.800" />);

    act(() => void vi.advanceTimersByTime(120));
    const enMarcha = container.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    expect(enMarcha).toMatch(/^\$ [\d.]+$/);
    expect(enMarcha).not.toBe('$ 582.800');

    act(() => void vi.advanceTimersByTime(1000));
    expect(container.textContent).toBe('$ 582.800');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('los lectores de pantalla leen el valor final mientras cuenta', () => {
    menosMovimiento(false);
    const { unmount } = render(<NumeroAnimado texto={15} />);
    act(() => void vi.advanceTimersByTime(50));
    expect(screen.getByText('15', { selector: '.sr-only' })).toBeInTheDocument();
    unmount(); // antes de devolver los temporizadores reales: la animación sigue en marcha
  });

  it('con menos movimiento se muestra el valor de una vez', () => {
    menosMovimiento(true);
    const { container } = render(<NumeroAnimado texto="$ 582.800" />);
    expect(container.textContent).toBe('$ 582.800');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('lo que no es un entero con puntos de miles se muestra tal cual', () => {
    menosMovimiento(false);
    for (const texto of ['4.5', 'Sin datos', '$ 1.234,50']) {
      const { container, unmount } = render(<NumeroAnimado texto={texto} />);
      act(() => void vi.advanceTimersByTime(100));
      expect(container.textContent).toBe(texto);
      unmount();
    }
  });

  it('el cero no cuenta', () => {
    menosMovimiento(false);
    const { container } = render(<NumeroAnimado texto={0} />);
    expect(container.textContent).toBe('0');
  });
});
