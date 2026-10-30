import { describe, expect, it } from 'vitest';
import { siguienteAccion } from './siguienteAccion';

type Entrada = Parameters<typeof siguienteAccion>[0];
const pedido = (estado: string, tipo: string, acciones: string[]): Entrada => ({
  estado: estado as Entrada['estado'],
  tipo_entrega: tipo as Entrada['tipo_entrega'],
  acciones_permitidas: acciones,
});

describe('siguienteAccion', () => {
  it('retiro en preparación: «Marcar listo para recoger»', () => {
    const accion = siguienteAccion(pedido('en_preparacion', 'retiro', ['listo-para-recoger', 'cancelar']), 'vendedor');
    expect(accion).toMatchObject({ accion: 'listo-para-recoger', etiqueta: 'Marcar listo para recoger' });
  });

  it('domicilio en preparación: sigue siendo «enviar» al domiciliario', () => {
    const accion = siguienteAccion(pedido('en_preparacion', 'domicilio', ['enviar', 'cancelar']), 'vendedor');
    expect(accion).toMatchObject({ accion: 'enviar', etiqueta: 'Entregado al domiciliario' });
    expect(siguienteAccion(pedido('en_preparacion', 'domicilio', ['enviar']), 'admin')?.etiqueta).toBe('En camino');
  });

  it('retiro listo con efectivo sin cobrar: «Entregar y cobrar»', () => {
    const accion = siguienteAccion(
      pedido('listo_para_recoger', 'retiro', ['entregar', 'cancelar', 'confirmar-pago']),
      'vendedor',
    );
    expect(accion).toMatchObject({ accion: 'entregar', etiqueta: 'Entregar y cobrar' });
  });

  it('retiro listo ya cobrado: «Marcar entregado»', () => {
    const accion = siguienteAccion(pedido('listo_para_recoger', 'retiro', ['entregar', 'cancelar']), 'vendedor');
    expect(accion?.etiqueta).toBe('Marcar entregado');
  });

  it('no ofrece nada que el backend no permita (vendedor en un domicilio en camino)', () => {
    expect(siguienteAccion(pedido('en_camino', 'domicilio', []), 'vendedor')).toBeNull();
    expect(siguienteAccion(pedido('en_camino', 'domicilio', ['entregar', 'no-recibido']), 'admin')?.accion).toBe(
      'entregar',
    );
  });

  it('estados finales sin acción', () => {
    expect(siguienteAccion(pedido('entregado', 'retiro', []), 'admin')).toBeNull();
    expect(siguienteAccion(pedido('cancelado', 'retiro', []), 'admin')).toBeNull();
  });
});
