import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MedallaCategoria, claveCategoria } from './iconos';

describe('MedallaCategoria', () => {
  it('muestra la foto de la categoría conocida', () => {
    const { container } = render(<MedallaCategoria nombre="Arepas" className="h-12 w-12" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/categorias/arepas.webp');
    expect(img).toHaveAttribute('alt', '');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('reconoce las categorías sin importar tildes ni mayúsculas', () => {
    expect(claveCategoria('Artesanías')).toBe('artesanias');
    expect(claveCategoria('PESCADOS y mariscos')).toBe('pescados');
    expect(claveCategoria('Frutas y verduras')).toBe('frutas');
  });

  it('una categoría desconocida usa el icono genérico, sin foto', () => {
    const { container } = render(<MedallaCategoria nombre="Mascotas" className="h-12 w-12" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('si la foto falla, vuelve al icono de la categoría', () => {
    const { container } = render(<MedallaCategoria nombre="Comida" className="h-12 w-12" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
