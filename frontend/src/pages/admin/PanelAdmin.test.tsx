import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelAdmin } from './PanelAdmin';

const mocks = vi.hoisted(() => ({ obtenerResumenAdmin: vi.fn(), listarPuestos: vi.fn(), obtenerVentas: vi.fn() }));
vi.mock('../../api/admin', () => ({ obtenerResumenAdmin: mocks.obtenerResumenAdmin }));
vi.mock('../../api/catalog', () => ({ listarPuestos: mocks.listarPuestos }));
vi.mock('../../api/payments', () => ({ obtenerVentas: mocks.obtenerVentas }));
vi.mock('../../components/ventas/SeccionesVentas', () => ({
  SeccionTopProductos: () => null,
  SeccionVentasPorDia: () => null,
  TarjetasVentas: () => null,
}));

function resumen(bloqueado: number) {
  return {
    usuarios: { total: 5, activos: 5, suspendidos: 0, por_rol: { vendedor: 2 } },
    pedidos: { total: 3, por_estado: { entregado: 1 }, activos: 2, con_no_recibido: 0 },
    pagos: { total: 1, por_confirmar: 0, total_vendido: '10000.00', comision: '800.00' },
    verificaciones_pendientes: 0,
    puestos: { total: 2, por_estado: {} },
    productos: { total: 4, por_estado: {}, bloqueados: 0 },
    resenas: { total: 0, ocultas: 0 },
    cupones: { total: 0, activos: 0 },
    comisiones: { al_dia: 1, aviso: 0, bloqueado },
    generado_en: '2026-11-04T10:00:00Z',
  };
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PanelAdmin />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.listarPuestos.mockReset().mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  mocks.obtenerVentas.mockReset().mockResolvedValue({ totales: { pedidos_pagados: 0 } });
});

describe('PanelAdmin: vendedores en pausa por comisión', () => {
  it('la tarjeta lleva a pagos y cuenta a los vendedores en pausa', async () => {
    mocks.obtenerResumenAdmin.mockResolvedValue(resumen(3));
    renderizar();

    const enlace = (await screen.findByText('Vendedores en pausa por comisión')).closest('a');
    expect(enlace).toHaveAttribute('href', '/admin/pagos');
    expect(enlace).toHaveTextContent('3');
  });

  it('con ninguno en pausa la tarjeta sigue ahí, en cero', async () => {
    mocks.obtenerResumenAdmin.mockResolvedValue(resumen(0));
    renderizar();

    const enlace = (await screen.findByText('Vendedores en pausa por comisión')).closest('a');
    expect(enlace).toHaveTextContent('0');
  });
});
