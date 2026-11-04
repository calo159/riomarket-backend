import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Privacidad, Terminos } from './Legal';

function ver(pagina: React.ReactElement) {
  return render(<MemoryRouter>{pagina}</MemoryRouter>);
}

describe('páginas legales', () => {
  it('los términos explican qué es RioMarket, las reglas de compra y la comisión del vendedor', () => {
    ver(<Terminos />);

    expect(screen.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Si compras' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Si vendes' })).toBeInTheDocument();
    expect(screen.getByText(/mientras esté pendiente/)).toBeInTheDocument();
    expect(document.title).toBe('Términos y condiciones · RioMarket');
  });

  it('la política de privacidad dice qué datos se guardan, los derechos y cómo ejercerlos', () => {
    ver(<Privacidad />);

    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument();
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument();
    expect(screen.getByText(/número de cédula \(se guarda cifrado\)/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tus derechos' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'soporte@riomarket.test' })[0]).toHaveAttribute(
      'href',
      'mailto:soporte@riomarket.test',
    );
  });

  it('cada documento enlaza al otro', () => {
    ver(<Terminos />);

    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacidad');
    expect(screen.getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute('href', '/terminos');
  });
});
