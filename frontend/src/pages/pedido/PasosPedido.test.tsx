import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasosPedido, pasosDelPedido } from './PasosPedido';

function textos() {
  return within(screen.getByRole('list', { name: 'Estado del pedido' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent?.replace(' (paso actual)', ''));
}

describe('PasosPedido', () => {
  it('retiro: Pendiente, Confirmado, En preparación, Listo para recoger, Entregado', () => {
    render(<PasosPedido estado="en_preparacion" tipoEntrega="retiro" />);
    expect(textos()).toEqual(['Pendiente', 'Confirmado', 'En preparación', 'Listo para recoger', 'Entregado']);
  });

  it('domicilio: sigue con «En camino»', () => {
    render(<PasosPedido estado="en_preparacion" tipoEntrega="domicilio" />);
    expect(textos()).toEqual(['Pendiente', 'Confirmado', 'En preparación', 'En camino', 'Entregado']);
  });

  it('marca como paso actual «Listo para recoger» en un retiro listo', () => {
    render(<PasosPedido estado="listo_para_recoger" tipoEntrega="retiro" />);
    const actual = screen.getByRole('listitem', { current: 'step' });
    expect(actual).toHaveTextContent('Listo para recoger');
  });

  it('un retiro heredado «en camino» se ve como «Listo para recoger»', () => {
    render(<PasosPedido estado="en_camino" tipoEntrega="retiro" />);
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Listo para recoger');
  });

  it('un pedido cancelado muestra el aviso en vez de los pasos', () => {
    render(<PasosPedido estado="cancelado" tipoEntrega="retiro" />);
    expect(screen.getByText('Este pedido se canceló')).toBeInTheDocument();
  });

  it('las claves de cada tipo no se mezclan', () => {
    expect(pasosDelPedido(undefined).map((p) => p.clave)).toContain('en_camino');
    expect(pasosDelPedido('retiro').map((p) => p.clave)).not.toContain('en_camino');
    expect(pasosDelPedido('domicilio').map((p) => p.clave)).not.toContain('listo_para_recoger');
  });
});
