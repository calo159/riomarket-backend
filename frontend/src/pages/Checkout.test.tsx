import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Checkout } from './Checkout';

const mocks = vi.hoisted(() => ({
  crearPedidoConPagoAlRecoger: vi.fn(),
  obtenerPuesto: vi.fn(),
  listarDirecciones: vi.fn(),
  vaciar: vi.fn(),
}));

vi.mock('../api/orders', () => ({ crearPedidoConPagoAlRecoger: mocks.crearPedidoConPagoAlRecoger }));
vi.mock('../api/catalog', () => ({ obtenerPuesto: mocks.obtenerPuesto }));
vi.mock('../api/addresses', () => ({ listarDirecciones: mocks.listarDirecciones, crearDireccion: vi.fn() }));
vi.mock('../api/coupons', () => ({ validarCupon: vi.fn() }));
vi.mock('../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 2, rol: 'comprador' }, rol: 'comprador' }) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../cart/CartProvider', () => ({
  useCart: () => ({
    carrito: {
      puestoId: 5,
      puestoNombre: 'Arepas de Doña Rosa',
      ofreceDomicilio: true,
      items: [{ productoId: 1, cantidad: 2 }],
    },
    subtotal: 10000,
    vaciar: mocks.vaciar,
  }),
}));

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedidos/:id" element={<p>Detalle del pedido</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Checkout con retiro', () => {
  beforeEach(() => {
    mocks.crearPedidoConPagoAlRecoger.mockReset();
    mocks.vaciar.mockReset();
    mocks.obtenerPuesto.mockResolvedValue({
      id: 5,
      nombre: 'Arepas de Doña Rosa',
      direccion: 'Calle 1 #2-3',
      ofrece_domicilio: true,
    });
    mocks.listarDirecciones.mockResolvedValue([]);
  });

  it('avisa que se paga en el puesto al recoger y crea el pedido de retiro', async () => {
    mocks.crearPedidoConPagoAlRecoger.mockResolvedValue({ id: 31, tipo_entrega: 'retiro' });
    renderizar();
    expect(await screen.findByText('Pagas en el puesto al recoger (efectivo)')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar pedido/ })[0]);
    await waitFor(() => expect(mocks.crearPedidoConPagoAlRecoger).toHaveBeenCalled());
    expect(mocks.crearPedidoConPagoAlRecoger.mock.calls[0][0]).toMatchObject({
      tipo_entrega: 'retiro',
      id_puesto: 5,
    });
    expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument();
  });

  it('con domicilio el aviso de pago al recoger desaparece', async () => {
    renderizar();
    await screen.findByText('Pagas en el puesto al recoger (efectivo)');
    fireEvent.click(screen.getByRole('button', { name: /Domicilio/ }));
    await waitFor(() =>
      expect(screen.queryByText('Pagas en el puesto al recoger (efectivo)')).not.toBeInTheDocument(),
    );
  });
});
