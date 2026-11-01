import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from './cart/CartProvider';
import { ToastProvider } from './components/ui/Toast';
import { Catalogo } from './pages/Catalogo';
import { Inicio } from './pages/Inicio';
import { consultaCategorias, consultaProductosInicio, consultaPuestosInicio } from './api/consultas';
import { claves } from './lib/queryKeys';
import { precargarRuta } from './api/precarga';

const catalogo = vi.hoisted(() => ({
  listarCategorias: vi.fn(),
  listarProductos: vi.fn(),
  listarPuestos: vi.fn(),
}));

vi.mock('./api/catalog', () => catalogo);
vi.mock('./auth/SessionProvider', () => ({
  useSession: () => ({ usuario: null, estado: 'anonimo', autenticado: false, rol: null }),
}));

const pagina = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });
const producto = (id: number) => ({
  id,
  id_puesto: 1,
  id_categoria: 1,
  nombre: `Producto ${id}`,
  precio: '1000.00',
  stock: 5,
  unidad_medida: 'unidad',
  imagenes: [],
  puesto_nombre: 'Puesto 1',
  puesto_ofrece_domicilio: true,
});
const puesto = (id: number) => ({
  id,
  nombre: `Puesto ${id}`,
  descripcion: '',
  portada: null,
  logo: null,
  categorias: [],
});

function cliente() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
}

describe('precargarRuta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogo.listarCategorias.mockResolvedValue([{ id: 1, nombre: 'Frutas y verduras' }]);
    catalogo.listarProductos.mockResolvedValue(pagina([producto(1), producto(2)]));
    catalogo.listarPuestos.mockResolvedValue(pagina([puesto(1)]));
  });

  it('precarga_la_tienda_con_las_mismas_claves_que_inicio', async () => {
    const queryClient = cliente();

    precargarRuta(queryClient, '/tienda');

    await waitFor(() => {
      expect(queryClient.getQueryData(claves.categorias)).toBeDefined();
      expect(queryClient.getQueryData(claves.productos.inicio)).toBeDefined();
      expect(queryClient.getQueryData(claves.puestos.inicio)).toBeDefined();
      // El segundo estante (productos de la categoría destacada) se pide al llegar las categorías.
      expect(queryClient.getQueryData(claves.productos.catalogo({ categoria: 1, page_size: 10 }))).toBeDefined();
    });
    expect(consultaCategorias.queryKey).toEqual(claves.categorias);
    expect(consultaProductosInicio.queryKey).toEqual(claves.productos.inicio);
    expect(consultaPuestosInicio.queryKey).toEqual(claves.puestos.inicio);
    expect(catalogo.listarProductos).toHaveBeenCalledWith({ page_size: 10, ordering: '-id' });
    expect(catalogo.listarPuestos).toHaveBeenCalledWith({ page_size: 6, ordering: 'nombre' });
  });

  it('la_tienda_no_vuelve_a_pedir_lo_que_la_precarga_ya_trajo', async () => {
    const queryClient = cliente();
    precargarRuta(queryClient, '/tienda');
    await waitFor(() => expect(queryClient.getQueryData(claves.productos.catalogo({ categoria: 1, page_size: 10 }))).toBeDefined());
    const llamadas = {
      categorias: catalogo.listarCategorias.mock.calls.length,
      productos: catalogo.listarProductos.mock.calls.length,
      puestos: catalogo.listarPuestos.mock.calls.length,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tienda']}>
          <ToastProvider>
            <CartProvider>
              <Inicio />
            </CartProvider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('Recién llegados');
    expect(catalogo.listarCategorias).toHaveBeenCalledTimes(llamadas.categorias);
    expect(catalogo.listarProductos).toHaveBeenCalledTimes(llamadas.productos);
    expect(catalogo.listarPuestos).toHaveBeenCalledTimes(llamadas.puestos);
  });

  it('precarga_el_catalogo_sin_filtros_con_la_misma_clave_que_la_pantalla', async () => {
    const queryClient = cliente();
    precargarRuta(queryClient, '/catalogo', '');
    await waitFor(() => expect(catalogo.listarProductos).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryClient.getQueryData(claves.categorias)).toBeDefined());
    expect(catalogo.listarProductos).toHaveBeenCalledWith({ page: 1, page_size: 15 });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/catalogo']}>
          <ToastProvider>
            <CartProvider>
              <Catalogo />
            </CartProvider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('2 resultados');
    expect(catalogo.listarProductos).toHaveBeenCalledTimes(1);
    expect(catalogo.listarCategorias).toHaveBeenCalledTimes(1);
  });

  it('con_filtros_en_la_url_no_precarga_el_catalogo', () => {
    const queryClient = cliente();

    precargarRuta(queryClient, '/catalogo', '?categoria=3&page=2');

    expect(catalogo.listarProductos).not.toHaveBeenCalled();
    expect(catalogo.listarCategorias).not.toHaveBeenCalled();
  });

  it('no_precarga_rutas_privadas', () => {
    const queryClient = cliente();
    const rutas = [
      '/',
      '/login',
      '/registro',
      '/carrito',
      '/checkout',
      '/mis-pedidos',
      '/pedidos/3',
      '/perfil',
      '/direcciones',
      '/notificaciones',
      '/vendedor',
      '/vendedor/productos',
      '/admin',
      '/admin/usuarios',
      '/productos/5',
      '/mapa',
    ];

    for (const ruta of rutas) precargarRuta(queryClient, ruta);

    expect(catalogo.listarCategorias).not.toHaveBeenCalled();
    expect(catalogo.listarProductos).not.toHaveBeenCalled();
    expect(catalogo.listarPuestos).not.toHaveBeenCalled();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('una_precarga_fallida_no_rompe_el_arranque', async () => {
    catalogo.listarCategorias.mockRejectedValue(new Error('sin red'));
    catalogo.listarProductos.mockRejectedValue(new Error('sin red'));
    catalogo.listarPuestos.mockRejectedValue(new Error('sin red'));
    const queryClient = cliente();

    expect(() => precargarRuta(queryClient, '/tienda')).not.toThrow();
    await waitFor(() => expect(catalogo.listarCategorias).toHaveBeenCalled());
  });

  it('acepta_la_ruta_con_barra_final', async () => {
    const queryClient = cliente();

    precargarRuta(queryClient, '/tienda/');

    await waitFor(() => expect(queryClient.getQueryData(claves.productos.inicio)).toBeDefined());
  });
});
