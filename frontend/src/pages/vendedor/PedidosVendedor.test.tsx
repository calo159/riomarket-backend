import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PedidosVendedor } from './PedidosVendedor';

const mocks = vi.hoisted(() => ({
  listarPedidos: vi.fn(),
  ejecutarAccionPedido: vi.fn(),
  exito: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../api/orders', () => ({
  listarPedidos: mocks.listarPedidos,
  ejecutarAccionPedido: mocks.ejecutarAccionPedido,
}));
vi.mock('../../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 7 } }) }));
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ exito: mocks.exito, error: mocks.error, info: vi.fn() }),
}));
vi.mock('../../navigation/useMenu', () => ({ invalidarMenu: vi.fn() }));

function pedidoBase(id: number, extra: Record<string, unknown>) {
  return {
    id,
    estado: 'listo_para_recoger',
    tipo_entrega: 'retiro',
    total: '9000.00',
    fecha_creacion: '2026-10-30T10:00:00Z',
    items: [{ id: 1 }],
    vence_en: new Date(Date.now() + 5 * 3_600_000 + 30_000).toISOString(),
    extensiones_plazo: 0,
    horas_extension: 24,
    acciones_permitidas: ['entregar', 'confirmar-pago', 'cancelar', 'extender-plazo'],
    ...extra,
  };
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PedidosVendedor />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PedidosVendedor: dar más tiempo', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('boton_dar_mas_tiempo_solo_si_el_backend_lo_permite', async () => {
    mocks.listarPedidos.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        pedidoBase(1, {}),
        // Ya dio más tiempo dos veces: el backend deja de ofrecer la acción y el botón desaparece.
        pedidoBase(2, {
          extensiones_plazo: 2,
          horas_extension: null,
          acciones_permitidas: ['entregar', 'confirmar-pago', 'cancelar'],
        }),
      ],
    });
    renderizar();
    expect(await screen.findByText('Pedido #1')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Dar 24 h más/ })).toHaveLength(1);
  });

  it('muestra cuándo vence cada pedido', async () => {
    mocks.listarPedidos.mockResolvedValue({ count: 1, next: null, previous: null, results: [pedidoBase(1, {})] });
    renderizar();
    expect(await screen.findByText(/Vence el .* · quedan 5 h/)).toBeInTheDocument();
  });

  it('un pedido sin plazo no muestra «Vence»', async () => {
    mocks.listarPedidos.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        pedidoBase(1, { vence_en: null, tipo_entrega: 'domicilio', estado: 'en_camino', acciones_permitidas: [] }),
      ],
    });
    renderizar();
    await screen.findByText('Pedido #1');
    expect(screen.queryByText(/Vence el/)).not.toBeInTheDocument();
  });

  it('al pulsarlo pide más tiempo y avisa con un mensaje claro', async () => {
    mocks.listarPedidos.mockResolvedValue({ count: 1, next: null, previous: null, results: [pedidoBase(1, {})] });
    mocks.ejecutarAccionPedido.mockResolvedValue({});
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Dar 24 h más/ }));
    await waitFor(() => expect(mocks.ejecutarAccionPedido).toHaveBeenCalledWith(1, 'extender-plazo'));
    await waitFor(() => expect(mocks.exito).toHaveBeenCalledWith('Le diste más tiempo al cliente.'));
  });

  it('si el backend rechaza, muestra su mensaje', async () => {
    mocks.listarPedidos.mockResolvedValue({ count: 1, next: null, previous: null, results: [pedidoBase(1, {})] });
    mocks.ejecutarAccionPedido.mockRejectedValue(new Error('Ya diste más tiempo dos veces a este pedido.'));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Dar 24 h más/ }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  });
});
