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
  // El carrito se puede cambiar por prueba (productos por encargo).
  carrito: null as unknown,
}));

const CARRITO_CON_STOCK = {
  puestoId: 5,
  puestoNombre: 'Arepas de Doña Rosa',
  ofreceDomicilio: true,
  items: [{ productoId: 1, nombre: 'Arepa', precio: '5000', cantidad: 2 }],
};
const CARRITO_CON_ENCARGO = {
  ...CARRITO_CON_STOCK,
  items: [
    { productoId: 1, nombre: 'Arepa', precio: '5000', cantidad: 2 },
    {
      productoId: 9,
      nombre: 'Torta de chocolate',
      precio: '50000',
      cantidad: 1,
      modalidad: 'encargo',
      preparacionHoras: 24,
      pideDetalles: true,
      detalles: 'Feliz cumpleaños Ana',
    },
  ],
};

vi.mock('../api/orders', () => ({ crearPedidoConPagoAlRecoger: mocks.crearPedidoConPagoAlRecoger }));
vi.mock('../api/catalog', () => ({ obtenerPuesto: mocks.obtenerPuesto }));
vi.mock('../api/addresses', () => ({ listarDirecciones: mocks.listarDirecciones, crearDireccion: vi.fn() }));
vi.mock('../api/coupons', () => ({ validarCupon: vi.fn() }));
vi.mock('../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 2, rol: 'comprador' }, rol: 'comprador' }) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../cart/CartProvider', () => ({
  useCart: () => ({
    carrito: mocks.carrito,
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
    mocks.carrito = CARRITO_CON_STOCK;
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

  it('avisa que el retiro se aparta y se cancela solo si no se recoge a tiempo', async () => {
    renderizar();
    expect(
      await screen.findByText('Te apartamos el pedido. Si no lo recoges a tiempo, se cancela solo.'),
    ).toBeInTheDocument();
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

describe('Checkout con productos por encargo', () => {
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

  it('pide_fecha_solo_con_encargos', async () => {
    mocks.carrito = CARRITO_CON_STOCK;
    const sin = renderizar();
    await screen.findByText('Pagas en el puesto al recoger (efectivo)');
    expect(screen.queryByText(/¿Para cuándo lo necesitas\?/)).not.toBeInTheDocument();
    sin.unmount();

    mocks.carrito = CARRITO_CON_ENCARGO;
    renderizar();
    expect(await screen.findByText(/¿Para cuándo lo necesitas\?/)).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha y hora para recogerlo')).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByLabelText('Fecha y hora para recogerlo')).toHaveAttribute('step', '900');
    // Los detalles del encargo se ven en el resumen.
    expect(screen.getByText('Feliz cumpleaños Ana')).toBeInTheDocument();
  });

  it('con domicilio cambia la etiqueta y avisa que se paga antes de que el puesto acepte', async () => {
    mocks.carrito = CARRITO_CON_ENCARGO;
    renderizar();
    await screen.findByText(/¿Para cuándo lo necesitas\?/);
    fireEvent.click(screen.getByRole('button', { name: /Domicilio/ }));
    expect(await screen.findByLabelText('Fecha y hora de entrega')).toBeInTheDocument();
    expect(screen.getByText(/A domicilio se paga antes de que el puesto acepte/)).toBeInTheDocument();
  });

  it('no deja confirmar sin fecha y muestra el error bajo el campo', async () => {
    mocks.carrito = CARRITO_CON_ENCARGO;
    renderizar();
    await screen.findByText(/¿Para cuándo lo necesitas\?/);
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar pedido/ })[0]);
    expect(await screen.findByText('Elige para cuándo lo necesitas.')).toBeInTheDocument();
    expect(mocks.crearPedidoConPagoAlRecoger).not.toHaveBeenCalled();
  });

  it('rechaza una fecha anterior a la preparación sin llamar al servidor', async () => {
    mocks.carrito = CARRITO_CON_ENCARGO;
    renderizar();
    const campo = await screen.findByLabelText('Fecha y hora para recogerlo');
    const ayer = new Date(Date.now() - 86_400_000);
    const dos = (n: number) => String(n).padStart(2, '0');
    fireEvent.change(campo, {
      target: {
        value: `${ayer.getFullYear()}-${dos(ayer.getMonth() + 1)}-${dos(ayer.getDate())}T10:00`,
      },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar pedido/ })[0]);
    expect(await screen.findByText(/necesita más tiempo para prepararlo/)).toBeInTheDocument();
    expect(mocks.crearPedidoConPagoAlRecoger).not.toHaveBeenCalled();
  });

  it('envia_fecha_solicitada_en_iso_y_los_detalles', async () => {
    mocks.carrito = CARRITO_CON_ENCARGO;
    mocks.crearPedidoConPagoAlRecoger.mockResolvedValue({ id: 40, tipo_entrega: 'retiro', tiene_encargo: true });
    renderizar();
    const campo = await screen.findByLabelText('Fecha y hora para recogerlo');
    const futuro = new Date(Date.now() + 5 * 86_400_000);
    futuro.setHours(16, 0, 0, 0);
    const dos = (n: number) => String(n).padStart(2, '0');
    const valor = `${futuro.getFullYear()}-${dos(futuro.getMonth() + 1)}-${dos(futuro.getDate())}T16:00`;
    fireEvent.change(campo, { target: { value: valor } });
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar pedido/ })[0]);
    await waitFor(() => expect(mocks.crearPedidoConPagoAlRecoger).toHaveBeenCalled());
    const datos = mocks.crearPedidoConPagoAlRecoger.mock.calls[0][0];
    expect(datos.fecha_solicitada).toBe(futuro.toISOString());
    expect(datos.items).toEqual([
      { id_producto: 1, cantidad: 2 },
      { id_producto: 9, cantidad: 1, detalles: 'Feliz cumpleaños Ana' },
    ]);
    expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument();
  });

  it('sin encargos no envia fecha_solicitada', async () => {
    mocks.carrito = CARRITO_CON_STOCK;
    mocks.crearPedidoConPagoAlRecoger.mockResolvedValue({ id: 41, tipo_entrega: 'retiro' });
    renderizar();
    await screen.findByText('Pagas en el puesto al recoger (efectivo)');
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar pedido/ })[0]);
    await waitFor(() => expect(mocks.crearPedidoConPagoAlRecoger).toHaveBeenCalled());
    expect(mocks.crearPedidoConPagoAlRecoger.mock.calls[0][0].fecha_solicitada).toBeUndefined();
  });
});
