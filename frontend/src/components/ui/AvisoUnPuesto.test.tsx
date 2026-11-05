import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvisoUnPuesto } from './AvisoUnPuesto';

const mocks = vi.hoisted(() => ({ carrito: null as unknown }));
vi.mock('../../cart/CartProvider', () => ({ useCart: () => ({ carrito: mocks.carrito }) }));

function montar() {
  return render(
    <MemoryRouter>
      <AvisoUnPuesto />
    </MemoryRouter>,
  );
}

describe('AvisoUnPuesto', () => {
  beforeEach(() => {
    mocks.carrito = null;
  });

  it('sin_carrito_no_muestra_nada', () => {
    const { container } = montar();
    expect(container).toBeEmptyDOMElement();
  });

  it('con_un_carrito_vacio_tampoco', () => {
    mocks.carrito = { puestoId: 5, puestoNombre: 'Dulces de Carmen', items: [] };
    const { container } = montar();
    expect(container).toBeEmptyDOMElement();
  });

  it('con_productos_dice_de_que_puesto_es_el_pedido_y_lleva_al_carrito', () => {
    mocks.carrito = { puestoId: 5, puestoNombre: 'Dulces de Carmen', items: [{ productoId: 1, cantidad: 1 }] };
    montar();

    expect(screen.getByRole('note')).toHaveTextContent('Tu pedido es de Dulces de Carmen');
    expect(screen.getByRole('note')).toHaveTextContent('Cada pedido es de un solo puesto');
    expect(screen.getByRole('link', { name: 'Ver mi pedido' })).toHaveAttribute('href', '/carrito');
  });
});
