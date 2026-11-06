import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Producto } from '../lib/types';
import { ComoFunciona } from './ComoFunciona';
import { PizarraPrecios } from './PizarraPrecios';
import { Banderines } from './ui/Banderines';
import { OlaTendida } from './ui/Decoracion';

const producto = (id: number) =>
  ({ id, nombre: `Producto ${id}`, precio: `${id}000.00`, unidad_medida: 'kg' }) as unknown as Producto;

describe('diseño de mercado', () => {
  it('la_cinta_de_precios_lista_cada_producto_como_enlace_y_oculta_su_copia', () => {
    render(
      <MemoryRouter>
        <PizarraPrecios productos={[1, 2, 3, 4].map(producto)} />
      </MemoryRouter>,
    );

    const region = screen.getByRole('region', { name: 'Productos y precios de los puestos' });
    // La copia que cierra el bucle no la lee un lector de pantalla ni se enfoca con el teclado.
    expect(within(region).getAllByRole('link')).toHaveLength(4);
    expect(within(region).getByRole('link', { name: /Producto 2/ })).toHaveAttribute('href', '/productos/2');
    const copia = region.querySelector('.pizarra-copia')!;
    expect(copia).toHaveAttribute('aria-hidden', 'true');
    copia.querySelectorAll('a').forEach((a) => expect(a).toHaveAttribute('tabindex', '-1'));
  });

  it('con_pocos_productos_la_cinta_no_se_muestra', () => {
    const { container } = render(
      <MemoryRouter>
        <PizarraPrecios productos={[1, 2, 3].map(producto)} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('como_funciona_son_tres_lineas_de_texto_sin_iconos', () => {
    const { container } = render(<ComoFunciona />);

    expect(screen.getByRole('region', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Cada pedido sale de un solo puesto.' })).toBeInTheDocument();
    const pasos = screen.getAllByRole('listitem');
    expect(pasos).toHaveLength(3);
    expect(within(pasos[0]).getByText('Eliges un puesto.')).toBeInTheDocument();
    expect(within(pasos[2]).getByText('Solo opina quien recibió su pedido.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('los_banderines_y_la_ola_tendida_son_decorativos', () => {
    const { container } = render(
      <>
        <Banderines />
        <OlaTendida />
      </>,
    );

    container.querySelectorAll('svg').forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'));
    // Irregulares: ni todos del mismo tamaño ni a la misma distancia.
    const n = container.querySelectorAll('.banderin').length;
    expect(n).toBeGreaterThan(14);
    expect(n).toBeLessThan(34);
    const anchos = new Set(Array.from(container.querySelectorAll('.banderin path')).map((p) => p.getAttribute('d')?.split('L')[0]?.length));
    expect(anchos.size).toBeGreaterThan(1);
  });
});
