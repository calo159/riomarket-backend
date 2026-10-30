import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapaPuestos } from './MapaPuestos';

const mocks = vi.hoisted(() => ({
  listarPuestos: vi.fn(),
  fallar: false,
  ultimasProps: null as null | { puestos: unknown[]; seleccion?: { id: number } | null },
}));

vi.mock('../api/catalog', () => ({ listarPuestos: mocks.listarPuestos }));
// Leaflet necesita un navegador real: se sustituye por un componente de prueba.
vi.mock('../components/mapa/MapaLeaflet', () => ({
  default: (props: { puestos: unknown[]; seleccion?: { id: number } | null; etiqueta: string }) => {
    if (mocks.fallar) throw new Error('no se pudo cargar el mapa');
    mocks.ultimasProps = props;
    return <div role="region" aria-label={props.etiqueta} data-marcadores={props.puestos.length} />;
  },
}));

const puesto = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  nombre: `Puesto ${id}`,
  direccion: `Calle ${id} #1-2`,
  horario: 'Lun-Sáb 7:00-14:00',
  ofrece_domicilio: id % 2 === 0,
  latitud: `11.54${id}000`,
  longitud: `-72.90${id}000`,
  ...extra,
});

const pagina = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/mapa']}>
        <Routes>
          <Route path="/mapa" element={<MapaPuestos />} />
          <Route path="/puestos/:id" element={<p>detalle del puesto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MapaPuestos', () => {
  beforeEach(() => {
    mocks.listarPuestos.mockReset();
    mocks.fallar = false;
    mocks.ultimasProps = null;
  });

  it('con varios puestos muestra el mapa y la lista con enlaces a cada puesto', async () => {
    mocks.listarPuestos.mockResolvedValue(pagina([puesto(1), puesto(2), puesto(3)]));
    montar();

    expect(screen.getByRole('heading', { level: 1, name: 'Mapa de puestos' })).toBeInTheDocument();
    const mapa = await screen.findByRole('region', { name: 'Mapa de puestos de Riohacha' });
    expect(mapa).toHaveAttribute('data-marcadores', '3');

    const lista = screen.getByRole('region', { name: '3 puestos' });
    const items = within(lista).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[1]).getByRole('link', { name: 'Puesto 2' })).toHaveAttribute('href', '/puestos/2');
    expect(within(items[1]).getByText('Ofrece domicilio')).toBeInTheDocument();
    expect(within(items[0]).getByText('Solo retiro en el puesto')).toBeInTheDocument();
  });

  it('la lista se usa con teclado: «Ver en el mapa» selecciona el puesto', async () => {
    mocks.listarPuestos.mockResolvedValue(pagina([puesto(1), puesto(2)]));
    const usuario = userEvent.setup();
    montar();
    await screen.findByRole('region', { name: 'Mapa de puestos de Riohacha' });

    const boton = screen.getByRole('button', { name: 'Ver Puesto 2 en el mapa' });
    boton.focus();
    await usuario.keyboard('{Enter}');
    await waitFor(() => expect(mocks.ultimasProps?.seleccion?.id).toBe(2));
  });

  it('con un solo puesto se ve bien: un marcador y «1 puesto»', async () => {
    mocks.listarPuestos.mockResolvedValue(pagina([puesto(1)]));
    montar();
    expect((await screen.findByRole('region', { name: 'Mapa de puestos de Riohacha' })).getAttribute('data-marcadores')).toBe('1');
    expect(screen.getByRole('region', { name: '1 puesto' })).toBeInTheDocument();
  });

  it('sin puestos con coordenadas no hay mapa y se explica', async () => {
    mocks.listarPuestos.mockResolvedValue(
      pagina([puesto(1, { latitud: null, longitud: null }), puesto(2, { latitud: '', longitud: '' })]),
    );
    montar();
    expect(await screen.findByText('Aún no hay puestos en el mapa')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Mapa de puestos de Riohacha' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar el catálogo' })).toHaveAttribute('href', '/catalogo');
  });

  it('con cero puestos muestra el estado vacío', async () => {
    mocks.listarPuestos.mockResolvedValue(pagina([]));
    montar();
    expect(await screen.findByText('Aún no hay puestos en el mapa')).toBeInTheDocument();
  });

  it('si la API falla muestra el error con reintento', async () => {
    mocks.listarPuestos.mockRejectedValue(new Error('sin conexión'));
    const usuario = userEvent.setup();
    montar();
    expect(await screen.findByText('No pudimos cargar los puestos.')).toBeInTheDocument();

    mocks.listarPuestos.mockResolvedValue(pagina([puesto(1)]));
    await usuario.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByRole('region', { name: '1 puesto' })).toBeInTheDocument();
  });

  it('si el mapa no carga deja la lista con un aviso', async () => {
    mocks.fallar = true;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.listarPuestos.mockResolvedValue(pagina([puesto(1), puesto(2)]));
    montar();

    expect(await screen.findByText('No pudimos cargar el mapa. Puedes usar la lista de puestos.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Puesto 1' })).toHaveAttribute('href', '/puestos/1');
    expect(screen.queryByRole('button', { name: /en el mapa/ })).not.toBeInTheDocument();
    error.mockRestore();
  });
});
