import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BotonWhatsapp } from './BotonWhatsapp';
import { enlaceWhatsapp, mensajeWhatsappProducto, mensajeWhatsappPuesto } from '../lib/whatsapp';

describe('BotonWhatsapp', () => {
  it('sin número no dibuja nada', () => {
    const { container, rerender } = render(<BotonWhatsapp numero={null} mensaje="Hola" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<BotonWhatsapp numero={undefined} mensaje="Hola" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<BotonWhatsapp numero="" mensaje="Hola" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('un valor que no son dígitos no genera enlace', () => {
    const { container } = render(<BotonWhatsapp numero="javascript:alert(1)" mensaje="Hola" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con número es un enlace a wa.me en pestaña nueva y sin referrer ni opener', () => {
    render(<BotonWhatsapp numero="573001234567" mensaje={mensajeWhatsappPuesto('Frutas del Caribe')} />);
    const enlace = screen.getByRole('link', { name: /Escribir por WhatsApp/ });
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
    const url = new URL(enlace.getAttribute('href')!);
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/573001234567');
    expect(url.searchParams.get('text')).toBe(
      'Hola, vi tu puesto Frutas del Caribe en RioMarket y quisiera más información.',
    );
  });
});

describe('enlaceWhatsapp', () => {
  it('codifica el mensaje', () => {
    const href = enlaceWhatsapp('573001234567', mensajeWhatsappProducto('Arepa & queso'));
    expect(href).toContain('Arepa%20%26%20queso');
  });

  it('rechaza números inválidos', () => {
    expect(enlaceWhatsapp('3001234567', 'x')).toBeNull();
    expect(enlaceWhatsapp('57300abc4567', 'x')).toBeNull();
  });
});
