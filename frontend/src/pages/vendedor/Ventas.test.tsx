import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ventas } from './Ventas';

const mocks = vi.hoisted(() => ({ obtenerVentas: vi.fn(), listarPuestos: vi.fn() }));

vi.mock('../../api/payments', () => ({ obtenerVentas: mocks.obtenerVentas }));
vi.mock('../../api/catalog', () => ({ listarPuestos: mocks.listarPuestos }));
vi.mock('../../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 7, nombre: 'Carmen Gómez' } }) }));

const puestos = (cantidad: number) => ({
  count: cantidad,
  next: null,
  previous: null,
  results: Array.from({ length: cantidad }, (_, i) => ({ id: 10 + i, nombre: i === 0 ? 'Dulces de Carmen' : 'Palenque de Carmen' })),
});

function respuesta(extra: Record<string, unknown> = {}, dias = 30) {
  const por_dia = Array.from({ length: dias }, (_, i) => ({
    fecha: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
    pedidos: i === 3 ? 2 : 0,
    ventas_brutas: i === 3 ? '30000.00' : '0.00',
    ingresos_netos: i === 3 ? '28500.00' : '0.00',
  }));
  return {
    dias,
    desde: '2026-10-02',
    hasta: '2026-10-31',
    zona_horaria: 'America/Bogota',
    puesto: null,
    totales: { pedidos_pagados: 2, unidades: 5, ventas_brutas: '30000.00', ingresos_netos: '28500.00', ticket_promedio: '15000.00' },
    por_dia,
    top_productos: [{ id_producto: 1, nombre: 'Enrollado de dulce', unidades: 5, ventas_brutas: '30000.00', puesto_nombre: null }],
    pedidos_por_estado: { pendiente: 1, confirmado: 0, en_preparacion: 0, en_camino: 0, listo_para_recoger: 0, entregado: 2, cancelado: 1 },
    cancelados_por_plazo: 1,
    generado_en: '2026-10-31T10:15:00-05:00',
    ...extra,
  };
}

function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Ventas />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Ventas', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listarPuestos.mockResolvedValue(puestos(1));
  });

  it('muestra las cifras que calcula el servidor, el gráfico y lo más vendido', async () => {
    mocks.obtenerVentas.mockResolvedValue(respuesta());
    renderizar();
    expect(await screen.findByText('Ingreso neto')).toBeInTheDocument();
    expect(screen.getByText(/28\.500/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Enrollado de dulce')).toBeInTheDocument();
    expect(screen.getByText('5 unid.')).toBeInTheDocument();
    expect(screen.getByText(/1 pedido se canceló solo por plazo/)).toBeInTheDocument();
    expect(mocks.obtenerVentas).toHaveBeenCalledWith({ dias: 30, puesto: null });
  });

  it('estado vacío sin ventas', async () => {
    mocks.obtenerVentas.mockResolvedValue(
      respuesta({
        totales: { pedidos_pagados: 0, unidades: 0, ventas_brutas: '0.00', ingresos_netos: '0.00', ticket_promedio: '0.00' },
        top_productos: [],
        cancelados_por_plazo: 0,
      }),
    );
    renderizar();
    expect(await screen.findByText('Todavía no tienes ventas en este periodo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis pedidos' })).toHaveAttribute('href', '/vendedor/pedidos');
    // Sin gráfico plano ni lista vacía de productos.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Lo que más vendes')).not.toBeInTheDocument();
    // Los pedidos por estado siguen ahí.
    expect(screen.getByText('Pedidos del periodo')).toBeInTheDocument();
  });

  it('selector de días recarga con el periodo elegido', async () => {
    mocks.obtenerVentas.mockImplementation(({ dias }: { dias: number }) => Promise.resolve(respuesta({}, dias)));
    renderizar();
    await screen.findByText('Ingreso neto');
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '7 días' }));
    await waitFor(() => expect(mocks.obtenerVentas).toHaveBeenCalledWith({ dias: 7, puesto: null }));
    expect(screen.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '90 días' }));
    await waitFor(() => expect(mocks.obtenerVentas).toHaveBeenCalledWith({ dias: 90, puesto: null }));
  });

  it('con dos puestos permite filtrar por uno', async () => {
    mocks.listarPuestos.mockResolvedValue(puestos(2));
    mocks.obtenerVentas.mockResolvedValue(respuesta());
    renderizar();
    const selector = await screen.findByLabelText('Puesto');
    fireEvent.change(selector, { target: { value: '11' } });
    await waitFor(() => expect(mocks.obtenerVentas).toHaveBeenCalledWith({ dias: 30, puesto: 11 }));
  });

  it('con un solo puesto no muestra el selector de puesto', async () => {
    mocks.obtenerVentas.mockResolvedValue(respuesta());
    renderizar();
    await screen.findByText('Ingreso neto');
    expect(screen.queryByLabelText('Puesto')).not.toBeInTheDocument();
  });

  it('sin puestos invita a crear uno y no pide ventas', async () => {
    mocks.listarPuestos.mockResolvedValue(puestos(0));
    renderizar();
    expect(await screen.findByText('Primero crea tu puesto para empezar a vender.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear puesto' })).toHaveAttribute('href', '/vendedor/puestos');
    expect(mocks.obtenerVentas).not.toHaveBeenCalled();
  });

  it('si falla muestra el error y deja reintentar', async () => {
    mocks.obtenerVentas.mockRejectedValueOnce(new Error('fallo')).mockResolvedValue(respuesta());
    renderizar();
    expect(await screen.findByText('No pudimos cargar tus ventas.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ingreso neto')).toBeInTheDocument();
  });
});
