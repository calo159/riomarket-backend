import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { aplicarSitio, reiniciarSitio, SITIO_POR_DEFECTO } from '../lib/sitio';
import { Privacidad, Terminos } from './Legal';

function ver(pagina: React.ReactElement) {
  return render(<MemoryRouter>{pagina}</MemoryRouter>);
}

describe('páginas legales', () => {
  afterEach(() => reiniciarSitio());

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
    // Sin correo de soporte en el panel, no se inventa uno: remite al pie de página.
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/los canales de contacto del pie de página/).length).toBeGreaterThan(0);
  });

  it('con un correo de soporte en el panel, la política lo enlaza', () => {
    aplicarSitio({ ...SITIO_POR_DEFECTO, correo_soporte: 'hola@mercacaribe.co' });

    ver(<Privacidad />);

    expect(screen.getAllByRole('link', { name: 'hola@mercacaribe.co' })[0]).toHaveAttribute(
      'href',
      'mailto:hola@mercacaribe.co',
    );
  });

  it('las páginas legales hablan en nombre de la marca y la ciudad del panel', () => {
    aplicarSitio({ ...SITIO_POR_DEFECTO, nombre_marca: 'MercaCaribe', ciudad: 'Santa Marta' });

    ver(<Terminos />);

    expect(document.title).toBe('Términos y condiciones · MercaCaribe');
    expect(screen.getAllByText(/MercaCaribe/).length).toBeGreaterThan(2);
    expect(screen.getAllByText(/Santa Marta/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/RioMarket/)).not.toBeInTheDocument();
  });

  it('cada documento enlaza al otro', () => {
    ver(<Terminos />);

    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacidad');
    expect(screen.getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute('href', '/terminos');
  });
});
