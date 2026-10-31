import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelVendedor } from './PanelVendedor';

const mocks = vi.hoisted(() => ({
  listarPuestos: vi.fn(),
  listarProductos: vi.fn(),
  listarPedidos: vi.fn(),
  obtenerResumenIngresos: vi.fn(),
  obtenerVentas: vi.fn(),
  miVerificacion: vi.fn(),
}));

vi.mock('../../api/catalog', () => ({ listarPuestos: mocks.listarPuestos, listarProductos: mocks.listarProductos }));
vi.mock('../../api/orders', () => ({ listarPedidos: mocks.listarPedidos }));
vi.mock('../../api/payments', () => ({
  obtenerResumenIngresos: mocks.obtenerResumenIngresos,
  obtenerVentas: mocks.obtenerVentas,
}));
vi.mock('../../api/verification', () => ({ miVerificacion: mocks.miVerificacion }));
vi.mock('../../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 7, nombre: 'Carmen Gómez' } }) }));

const vacio = { count: 0, next: null, previous: null, results: [] };

describe('PanelVendedor: ingresos aprobados', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listarPuestos.mockResolvedValue(vacio);
    mocks.listarProductos.mockResolvedValue(vacio);
    mocks.listarPedidos.mockResolvedValue(vacio);
    mocks.miVerificacion.mockResolvedValue({ estado_verificacion: 'aprobado' });
    mocks.obtenerVentas.mockResolvedValue({ totales: { pedidos_pagados: 0 }, por_dia: [] });
  });

  it('muestra el total que calcula el servidor, sin sumar en el cliente', async () => {
    mocks.obtenerResumenIngresos.mockResolvedValue({ pagos_aprobados: 250, ingresos_aprobados: '1234500.00' });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <PanelVendedor />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const tarjeta = await screen.findByText('Ingresos aprobados');
    expect(await screen.findByText(/1\.234\.500/)).toBeInTheDocument();
    expect(tarjeta).toBeInTheDocument();
    expect(mocks.obtenerResumenIngresos).toHaveBeenCalledTimes(1);
  });
});
