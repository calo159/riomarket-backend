import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Pedido } from '../../lib/types';
import { TicketEnviado } from './TicketEnviado';

const pedido = (extra: Record<string, unknown> = {}) =>
  ({
    id: 44,
    tipo_entrega: 'retiro',
    total: '55000.00',
    items: [
      { id: 1, cantidad: 2 },
      { id: 2, cantidad: 1 },
    ],
    ...extra,
  }) as unknown as Pedido;

describe('TicketEnviado', () => {
  it('muestra_el_pedido_enviado_con_su_mensaje_y_el_resumen', () => {
    render(<TicketEnviado datos={pedido()} mensaje="Tu pedido fue creado. Pagas ahí." />);

    const ticket = screen.getByRole('status', { name: 'Pedido 44 enviado' });
    expect(ticket).toHaveTextContent('Pedido #44 enviado');
    expect(ticket).toHaveTextContent('Tu pedido fue creado. Pagas ahí.');
    expect(screen.getByText('Retiro en el puesto')).toBeInTheDocument();
    expect(screen.getByText(/55\.000/)).toBeInTheDocument();
  });

  it('cuenta_las_unidades_no_las_lineas', () => {
    render(<TicketEnviado datos={pedido()} mensaje="x" />);

    expect(screen.getByText('Productos').nextElementSibling).toHaveTextContent('3');
  });

  it('dice_a_domicilio_cuando_lo_es', () => {
    render(<TicketEnviado datos={pedido({ tipo_entrega: 'domicilio' })} mensaje="x" />);

    expect(screen.getByText('A domicilio')).toBeInTheDocument();
  });

  it('un_pedido_sin_items_no_rompe', () => {
    render(<TicketEnviado datos={pedido({ items: undefined })} mensaje="x" />);

    expect(screen.getByText('Productos').nextElementSibling).toHaveTextContent('0');
  });
});
