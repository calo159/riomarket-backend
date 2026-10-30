import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PedidoDetalle } from './PedidoDetalle';

const mocks = vi.hoisted(() => ({
  obtenerPedido: vi.fn(),
  ejecutarAccionPedido: vi.fn(),
  reportarNoRecibido: vi.fn(),
  listarPagos: vi.fn(),
  crearPago: vi.fn(),
  confirmarEfectivo: vi.fn(),
  simularPago: vi.fn(),
  listarResenas: vi.fn(),
  crearResena: vi.fn(),
  sesion: { usuario: { id: 1, rol: 'vendedor' }, rol: 'vendedor' } as {
    usuario: { id: number; rol: string };
    rol: string;
  },
}));

vi.mock('../api/orders', () => ({
  obtenerPedido: mocks.obtenerPedido,
  ejecutarAccionPedido: mocks.ejecutarAccionPedido,
  reportarNoRecibido: mocks.reportarNoRecibido,
}));
vi.mock('../api/payments', () => ({
  listarPagos: mocks.listarPagos,
  crearPago: mocks.crearPago,
  confirmarEfectivo: mocks.confirmarEfectivo,
  simularPago: mocks.simularPago,
}));
vi.mock('../api/reviews', () => ({ listarResenas: mocks.listarResenas, crearResena: mocks.crearResena }));
vi.mock('../auth/SessionProvider', () => ({ useSession: () => mocks.sesion }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../navigation/useMenu', () => ({ invalidarMenu: vi.fn() }));

const PEDIDO = {
  id: 9,
  estado: 'pendiente',
  id_comprador: 2,
  id_puesto: 5,
  tipo_entrega: 'retiro',
  items: [],
  subtotal: '10000.00',
  total: '10000.00',
  tarifa_domicilio: '0.00',
  descuento_cupon: '0.00',
  fecha_creacion: '2026-03-01T10:00:00Z',
  fecha_actualizacion: '2026-03-01T10:00:00Z',
  acciones_permitidas: [] as string[],
};

const PAGO_EFECTIVO = {
  id: 3,
  id_pedido: 9,
  metodo_pago: 'efectivo',
  estado: 'pendiente',
  total_cobrado: '10000.00',
  fecha_creacion: '2026-03-01T10:00:00Z',
};

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/pedidos/9']}>
        <Routes>
          <Route path="/pedidos/:id" element={<PedidoDetalle />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PedidoDetalle: los botones de pago salen de acciones_permitidas', () => {
  beforeEach(() => {
    Object.entries(mocks).forEach(([clave, mock]) => clave !== 'sesion' && (mock as ReturnType<typeof vi.fn>).mockReset());
    mocks.listarResenas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    mocks.listarPagos.mockResolvedValue({ count: 1, next: null, previous: null, results: [PAGO_EFECTIVO] });
  });

  it('el vendedor de ESE pedido ve «Confirmar cobro en efectivo»', async () => {
    mocks.sesion.usuario = { id: 1, rol: 'vendedor' };
    mocks.sesion.rol = 'vendedor';
    mocks.obtenerPedido.mockResolvedValue({ ...PEDIDO, acciones_permitidas: ['confirmar-pago'] });
    renderizar();
    expect(await screen.findByRole('button', { name: 'Confirmar cobro en efectivo' })).toBeInTheDocument();
  });

  it('otro vendedor (sin la acción) no ve el botón aunque su rol sea vendedor', async () => {
    mocks.sesion.usuario = { id: 77, rol: 'vendedor' };
    mocks.sesion.rol = 'vendedor';
    mocks.obtenerPedido.mockResolvedValue({ ...PEDIDO, acciones_permitidas: [] });
    renderizar();
    await screen.findByText(/Pedido #9/);
    expect(screen.queryByRole('button', { name: 'Confirmar cobro en efectivo' })).not.toBeInTheDocument();
  });

  it('el comprador ve «Pagar pedido» solo si el backend lo permite', async () => {
    mocks.sesion.usuario = { id: 2, rol: 'comprador' };
    mocks.sesion.rol = 'comprador';
    mocks.listarPagos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    mocks.obtenerPedido.mockResolvedValue({ ...PEDIDO, acciones_permitidas: ['pagar', 'cancelar'] });
    renderizar();
    expect((await screen.findAllByRole('button', { name: /Pagar pedido/ })).length).toBeGreaterThan(0);
  });

  it('sin la acción «pagar» el comprador no ve el botón de pago', async () => {
    mocks.sesion.usuario = { id: 2, rol: 'comprador' };
    mocks.sesion.rol = 'comprador';
    mocks.listarPagos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    mocks.obtenerPedido.mockResolvedValue({ ...PEDIDO, acciones_permitidas: ['cancelar'] });
    renderizar();
    await screen.findByText(/Pedido #9/);
    expect(screen.queryByRole('button', { name: /Pagar pedido/ })).not.toBeInTheDocument();
  });

  describe('retiro en el puesto', () => {
    const LISTO = { ...PEDIDO, estado: 'listo_para_recoger', tipo_entrega: 'retiro' };

    it('el vendedor ve «Entregar y cobrar» con efectivo sin cobrar', async () => {
      mocks.sesion.usuario = { id: 1, rol: 'vendedor' };
      mocks.sesion.rol = 'vendedor';
      mocks.obtenerPedido.mockResolvedValue({ ...LISTO, acciones_permitidas: ['entregar', 'cancelar', 'confirmar-pago'] });
      renderizar();
      expect(await screen.findByRole('button', { name: /Entregar y cobrar/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /No me ha llegado/ })).not.toBeInTheDocument();
    });

    it('el vendedor ve «Marcar entregado» si el pago ya está cobrado', async () => {
      mocks.sesion.usuario = { id: 1, rol: 'vendedor' };
      mocks.sesion.rol = 'vendedor';
      mocks.listarPagos.mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [{ ...PAGO_EFECTIVO, estado: 'aprobado' }],
      });
      mocks.obtenerPedido.mockResolvedValue({ ...LISTO, acciones_permitidas: ['entregar', 'cancelar'] });
      renderizar();
      expect(await screen.findByRole('button', { name: /Marcar entregado/ })).toBeInTheDocument();
    });

    it('el comprador ve «Ya recogí mi pedido» y nunca «No me ha llegado»', async () => {
      mocks.sesion.usuario = { id: 2, rol: 'comprador' };
      mocks.sesion.rol = 'comprador';
      mocks.obtenerPedido.mockResolvedValue({ ...LISTO, acciones_permitidas: ['entregar', 'cancelar'] });
      renderizar();
      expect(await screen.findByRole('button', { name: /Ya recogí mi pedido/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /No me ha llegado/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ya recibí/ })).not.toBeInTheDocument();
    });

    it('con efectivo pendiente el comprador no ve botón de entrega y lee «Pagas ahí»', async () => {
      mocks.sesion.usuario = { id: 2, rol: 'comprador' };
      mocks.sesion.rol = 'comprador';
      mocks.obtenerPedido.mockResolvedValue({ ...PEDIDO, estado: 'en_preparacion', acciones_permitidas: ['cancelar'] });
      renderizar();
      expect(await screen.findByText('Pasa por el puesto cuando esté listo. Pagas ahí.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ya recogí/ })).not.toBeInTheDocument();
    });

    it('los pasos del seguimiento son los del retiro', async () => {
      mocks.sesion.usuario = { id: 2, rol: 'comprador' };
      mocks.sesion.rol = 'comprador';
      mocks.obtenerPedido.mockResolvedValue({ ...LISTO, acciones_permitidas: [] });
      renderizar();
      const pasos = await screen.findByRole('list', { name: 'Estado del pedido' });
      expect(pasos).toHaveTextContent('Listo para recoger');
      expect(pasos).not.toHaveTextContent('En camino');
    });
  });

  describe('domicilio', () => {
    it('el comprador ve «Ya recibí mi pedido» y «No me ha llegado»', async () => {
      mocks.sesion.usuario = { id: 2, rol: 'comprador' };
      mocks.sesion.rol = 'comprador';
      mocks.obtenerPedido.mockResolvedValue({
        ...PEDIDO,
        estado: 'en_camino',
        tipo_entrega: 'domicilio',
        acciones_permitidas: ['entregar', 'no-recibido'],
      });
      renderizar();
      expect(await screen.findByRole('button', { name: /Ya recibí mi pedido/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /No me ha llegado/ })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Estado del pedido' })).toHaveTextContent('En camino');
    });
  });
});
