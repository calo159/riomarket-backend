import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('../lib/http', () => ({ api: mocks }));

import { crearPedidoConPagoEnEfectivo, type DatosPedido } from './orders';

const BASE: DatosPedido = { id_puesto: 5, tipo_entrega: 'retiro', items: [{ id_producto: 1, cantidad: 2 }] };

describe('crearPedidoConPagoEnEfectivo', () => {
  beforeEach(() => {
    mocks.post.mockReset();
  });

  it('retiro: crea el pedido y registra el pago en efectivo', async () => {
    mocks.post.mockImplementation(async (url: string) =>
      url === '/orders/pedidos/' ? { data: { id: 42, tipo_entrega: 'retiro' } } : { data: { id: 7, metodo_pago: 'efectivo' } },
    );
    const pedido = await crearPedidoConPagoEnEfectivo(BASE);
    expect(pedido.id).toBe(42);
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/payments/pagos/', { pedido: 42, metodo_pago: 'efectivo' });
  });

  it('retiro: si el pago falla, devuelve igual el pedido (queda «Pagar pedido» en el detalle)', async () => {
    mocks.post.mockImplementation(async (url: string) => {
      if (url === '/orders/pedidos/') return { data: { id: 43, tipo_entrega: 'retiro' } };
      throw new Error('boom');
    });
    const pedido = await crearPedidoConPagoEnEfectivo(BASE);
    expect(pedido.id).toBe(43);
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });

  it('retiro: si falla crear el pedido, no intenta pagar', async () => {
    mocks.post.mockRejectedValue(new Error('sin stock'));
    let error: unknown;
    try {
      await crearPedidoConPagoEnEfectivo(BASE);
    } catch (e) {
      error = e;
    }
    expect(String(error)).toContain('sin stock');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('domicilio: también registra el pago en efectivo, que se cobra contra entrega', async () => {
    mocks.post.mockImplementation(async (url: string) =>
      url === '/orders/pedidos/' ? { data: { id: 44, tipo_entrega: 'domicilio' } } : { data: { id: 8, metodo_pago: 'efectivo' } },
    );
    await crearPedidoConPagoEnEfectivo({ ...BASE, tipo_entrega: 'domicilio', direccion_entrega: 'Calle 1' });
    expect(mocks.post).toHaveBeenNthCalledWith(1, '/orders/pedidos/', expect.objectContaining({ tipo_entrega: 'domicilio' }));
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/payments/pagos/', { pedido: 44, metodo_pago: 'efectivo' });
  });
});
