import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../cart/CartProvider';
import type { Producto, Puesto } from '../lib/types';
import { BotonVolverAPedir } from './BotonVolverAPedir';

const mocks = vi.hoisted(() => ({
  obtenerProducto: vi.fn(),
  obtenerPuesto: vi.fn(),
  exito: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../api/catalog', () => ({ obtenerProducto: mocks.obtenerProducto, obtenerPuesto: mocks.obtenerPuesto }));
vi.mock('../auth/SessionProvider', () => ({ useSession: () => ({ usuario: { id: 1 } }) }));
vi.mock('./ui/Toast', () => ({ useToast: () => ({ exito: mocks.exito, info: mocks.info, error: mocks.error }) }));

const puesto = (id: number) => ({ id, nombre: `Puesto ${id}`, estado: 'activo', ofrece_domicilio: false }) as unknown as Puesto;
const producto = (id: number, extra: Partial<Producto> = {}) =>
  ({ id, nombre: `Producto ${id}`, precio: '2000.00', stock: 10, estado: 'activo', unidad_medida: 'unidad', imagenes: [], ...extra }) as unknown as Producto;

const pedido = (estado: string, items: number[] = [1, 2, 3, 4]) => ({
  id: 5,
  id_puesto: 1,
  estado,
  items: items.map((id) => ({ id_producto: id, nombre_producto: `Producto ${id}`, cantidad: 2 })),
});

function Estado() {
  const { carrito } = useCart();
  return <p data-testid="carrito">{carrito ? `${carrito.puestoNombre}:${carrito.items.map((i) => `${i.productoId}x${i.cantidad}`).join(',')}` : 'vacio'}</p>;
}

function montar(estado = 'entregado', items?: number[]) {
  return render(
    <MemoryRouter initialEntries={['/mis-pedidos']}>
      <CartProvider>
        <Routes>
          <Route path="/mis-pedidos" element={<BotonVolverAPedir pedido={pedido(estado, items) as never} />} />
          <Route path="/carrito" element={<p>pantalla del carrito</p>} />
        </Routes>
        <Estado />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('BotonVolverAPedir', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.obtenerPuesto.mockResolvedValue(puesto(1));
  });

  it('solo aparece en pedidos entregados o cancelados', () => {
    const { unmount } = montar('en_camino');
    expect(screen.queryByRole('button', { name: 'Volver a pedir' })).not.toBeInTheDocument();
    unmount();
    montar('cancelado');
    expect(screen.getByRole('button', { name: 'Volver a pedir' })).toBeInTheDocument();
  });

  it('agrega lo disponible, avisa lo que no y lleva al carrito', async () => {
    mocks.obtenerProducto.mockImplementation(async (id: number) => {
      if (id === 4) return producto(4, { stock: 0 });
      if (id === 2) return producto(2, { stock: 1 });
      return producto(id);
    });
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole('button', { name: 'Volver a pedir' }));

    expect(await screen.findByText('pantalla del carrito')).toBeInTheDocument();
    expect(screen.getByTestId('carrito')).toHaveTextContent('Puesto 1:1x2,2x1,3x2');
    expect(mocks.info).toHaveBeenCalledWith(
      'Agregamos 3 de 4 productos; Producto 4 ya no está disponible; de Producto 2 solo quedan 1.',
    );
  });

  it('si ningún producto está disponible no toca el carrito ni navega', async () => {
    mocks.obtenerProducto.mockRejectedValue(new Error('404'));
    const usuario = userEvent.setup();
    montar('entregado', [1, 2]);
    await usuario.click(screen.getByRole('button', { name: 'Volver a pedir' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText('pantalla del carrito')).not.toBeInTheDocument();
    expect(screen.getByTestId('carrito')).toHaveTextContent('vacio');
  });

  it('con un carrito de otro puesto pide confirmación y no lo pisa en silencio', async () => {
    localStorage.setItem(
      'riomarket.carrito',
      JSON.stringify({
        puestoId: 9,
        puestoNombre: 'Otro puesto',
        ofreceDomicilio: false,
        items: [{ productoId: 99, nombre: 'Algo', precio: '1000', unidadMedida: 'unidad', cantidad: 1, stock: 5 }],
      }),
    );
    mocks.obtenerProducto.mockImplementation(async (id: number) => producto(id));
    const usuario = userEvent.setup();
    montar('entregado', [1]);
    await usuario.click(screen.getByRole('button', { name: 'Volver a pedir' }));

    expect(await screen.findByText('Tu carrito tiene productos de otro puesto')).toBeInTheDocument();
    expect(screen.getByTestId('carrito')).toHaveTextContent('Otro puesto:99x1');
    expect(screen.queryByText('pantalla del carrito')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Vaciar y agregar' }));
    expect(await screen.findByText('pantalla del carrito')).toBeInTheDocument();
    expect(screen.getByTestId('carrito')).toHaveTextContent('Puesto 1:1x2');
  });

  it('si el usuario cancela la confirmación el carrito queda igual', async () => {
    localStorage.setItem(
      'riomarket.carrito',
      JSON.stringify({
        puestoId: 9,
        puestoNombre: 'Otro puesto',
        ofreceDomicilio: false,
        items: [{ productoId: 99, nombre: 'Algo', precio: '1000', unidadMedida: 'unidad', cantidad: 1, stock: 5 }],
      }),
    );
    mocks.obtenerProducto.mockImplementation(async (id: number) => producto(id));
    const usuario = userEvent.setup();
    montar('entregado', [1]);
    await usuario.click(screen.getByRole('button', { name: 'Volver a pedir' }));
    await screen.findByText('Tu carrito tiene productos de otro puesto');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByTestId('carrito')).toHaveTextContent('Otro puesto:99x1');
  });
});
