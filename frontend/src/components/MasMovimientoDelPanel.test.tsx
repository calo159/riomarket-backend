import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnaVez } from '../lib/useUnaVez';
import { NumeroAnimado } from './ui/NumeroAnimado';
import { Segmentado } from './ui/Segmentado';
import { BarrasHorizontales } from './graficos/BarrasHorizontales';

function simularMovimiento(reducido: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('reduce') ? reducido : false,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('NumeroAnimado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    simularMovimiento(false);
  });

  it('la primera vez cuenta desde cero y no destella', () => {
    const { container } = render(<NumeroAnimado texto="1.500" />);

    expect(container.querySelector('.numero-cambia')).toBeNull();
    act(() => vi.advanceTimersByTime(2000));
    expect(container).toHaveTextContent('1.500');
  });

  it('si el valor cambia, destella y cuenta desde el que tenía (no desde cero)', () => {
    const { container, rerender } = render(<NumeroAnimado texto="1.000" />);
    act(() => vi.advanceTimersByTime(2000));

    rerender(<NumeroAnimado texto="1.200" />);
    expect(container.querySelector('.numero-cambia')).not.toBeNull();

    // A mitad de camino se ve algo entre lo anterior y lo nuevo, nunca por debajo de lo anterior.
    act(() => vi.advanceTimersByTime(120));
    const visto = Number((container.querySelector('[aria-hidden="true"]')?.textContent ?? '0').replace(/\./g, ''));
    expect(visto).toBeGreaterThanOrEqual(1000);
    expect(visto).toBeLessThanOrEqual(1200);

    act(() => vi.advanceTimersByTime(1500));
    expect(container).toHaveTextContent('1.200');
  });

  it('el lector de pantalla lee siempre el valor final', () => {
    render(<NumeroAnimado texto="2.500" />);

    expect(screen.getByText('2.500', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('con «reducir movimiento» muestra el valor sin animar ni destellar', () => {
    simularMovimiento(true);
    const { container, rerender } = render(<NumeroAnimado texto="1.000" />);

    rerender(<NumeroAnimado texto="1.200" />);

    expect(container).toHaveTextContent('1.200');
    expect(container.querySelector('.numero-cambia')).toBeNull();
  });

  it('un texto que no es una cifra se muestra tal cual', () => {
    const { container } = render(<NumeroAnimado texto="sin datos" />);

    expect(container).toHaveTextContent('sin datos');
  });
});

describe('Segmentado', () => {
  const opciones = [
    { valor: 'a', etiqueta: 'Lista' },
    { valor: 'b', etiqueta: 'Matriz', id: 'tab-b', controla: 'panel-b' },
  ];

  it('es un tablist con una pestaña elegida y una pastilla decorativa', () => {
    render(<Segmentado etiqueta="Vista" opciones={opciones} valor="a" onCambiar={() => undefined} />);

    expect(screen.getByRole('tablist', { name: 'Vista' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lista' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Matriz' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Matriz' })).toHaveAttribute('aria-controls', 'panel-b');
    expect(document.querySelector('.segmentado-pastilla, [aria-hidden="true"].absolute')).not.toBeNull();
  });

  it('al pulsar una opción avisa cuál se eligió', () => {
    const alCambiar = vi.fn();
    render(<Segmentado etiqueta="Vista" opciones={opciones} valor="a" onCambiar={alCambiar} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Matriz' }));

    expect(alCambiar).toHaveBeenCalledWith('b');
  });
});

describe('useUnaVez', () => {
  it('se enciende al dispararlo y se apaga solo', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUnaVez(1000));
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(20));
    expect(result.current[0]).toBe(true);

    act(() => vi.advanceTimersByTime(1100));
    expect(result.current[0]).toBe(false);
  });
});

describe('barras horizontales', () => {
  it('cada barra crece desde cero, una tras otra', () => {
    const { container } = render(
      <BarrasHorizontales
        filas={[
          { id: 1, nombre: 'Arepa', unidades: 10, ventas: '35000.00' },
          { id: 2, nombre: 'Bollo', unidades: 5, ventas: '10000.00' },
        ]}
      />,
    );

    const barras = container.querySelectorAll<HTMLElement>('.animate-grow');
    expect(barras).toHaveLength(2);
    expect(barras[1].style.animationDelay).toBe('90ms');
  });
});

describe('casillas y botones de opción propios', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf-8');

  it('la marca de elegido sale de un dibujo propio que rebota (no la del sistema)', () => {
    expect(css).toMatch(/input\[type='checkbox'\],\s*input\[type='radio'\]\s*\{[^}]*appearance: none/);
    expect(css).toMatch(/input\[type='checkbox'\]::after\s*\{[^}]*cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/);
  });

  it('en oscuro el elegido usa los colores de la noche', () => {
    expect(css).toMatch(/\.dark input\[type='checkbox'\]:checked/);
  });
});
