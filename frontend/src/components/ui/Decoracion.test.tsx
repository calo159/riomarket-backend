import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BordeFestoneado, desvanecer, desvanecerEnMancha, OlasInferiores, PatronOlas } from './Decoracion';

describe('decoración de marca', () => {
  it('es siempre invisible para los lectores de pantalla', () => {
    const { container } = render(
      <div>
        <PatronOlas />
        <OlasInferiores />
        <BordeFestoneado />
      </div>,
    );
    const decorativos = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorativos.length).toBeGreaterThanOrEqual(3);
    // Nada interactivo ni con texto propio.
    expect(container.querySelector('a, button, input')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('dos patrones en la misma página no comparten id (si no, uno pintaría con el relleno del otro)', () => {
    const { container } = render(
      <div>
        <PatronOlas />
        <PatronOlas />
      </div>,
    );
    const ids = [...container.querySelectorAll('pattern')].map((patron) => patron.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const rect of container.querySelectorAll('rect')) {
      expect(ids).toContain(rect.getAttribute('fill')?.replace(/^url\(#|\)$/g, ''));
    }
  });

  it('las máscaras llevan la versión con prefijo (Safari) y la estándar', () => {
    for (const estilo of [desvanecer('to top', 70), desvanecerEnMancha('50% 100%', 80, 100)]) {
      expect(estilo.maskImage).toBeTruthy();
      expect(estilo.WebkitMaskImage).toBe(estilo.maskImage);
    }
  });

  it('las olas inferiores se mueven con una animación (que «menos movimiento» detiene en index.css)', () => {
    const { container } = render(<OlasInferiores />);
    expect(container.querySelectorAll('svg.animate-deriva, svg.animate-deriva-inversa')).toHaveLength(2);
  });
});
