import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';
import { OLAS, PANELES_TOLDO } from './MarcaSvg';

describe('Logo', () => {
  it('es un enlace al inicio con nombre accesible; el símbolo es decorativo', () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>,
    );
    const enlace = screen.getByRole('link', { name: 'RioMarket, ir al inicio' });
    expect(enlace).toHaveAttribute('href', '/tienda');
    expect(enlace.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(enlace).toHaveTextContent('RioMarket');
  });

  it('sobre la marca (turquesa u oscuro) el símbolo va sin cuadro, para no fundirse con el fondo', () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>,
    );
    expect(container.querySelector('svg rect')).not.toBeNull();
    rerender(
      <MemoryRouter>
        <Logo sobreMarca />
      </MemoryRouter>,
    );
    expect(container.querySelector('svg rect')).toBeNull();
  });
});

describe('símbolo', () => {
  it('coincide con public/brand/marca.svg, que genera scripts/generar_logo.py', () => {
    const archivo = readFileSync(resolve(__dirname, '../../../public/brand/marca.svg'), 'utf-8');
    const trazos = [...archivo.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    expect(trazos).toEqual([...PANELES_TOLDO, ...OLAS].map((p) => p.d));
  });
});
