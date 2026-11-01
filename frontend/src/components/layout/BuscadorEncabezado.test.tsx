import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BuscadorEncabezado } from './BuscadorEncabezado';

const mocks = vi.hoisted(() => ({ listarProductos: vi.fn(), listarPuestos: vi.fn() }));
vi.mock('../../api/catalog', () => mocks);

function Ubicacion() {
  const ubicacion = useLocation();
  return <p data-testid="ruta">{ubicacion.pathname + ubicacion.search}</p>;
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}>
        <BuscadorEncabezado categorias={[{ id: 3, nombre: 'Comida' } as never]} />
        <Routes>
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return screen.getByRole('combobox', { name: 'Buscar productos' });
}

describe('BuscadorEncabezado', () => {
  beforeEach(() => {
    mocks.listarProductos.mockReset().mockResolvedValue({
      results: [
        { id: 9, nombre: 'Arepa de huevo', precio: '3500.00', imagenes: [] },
        { id: 10, nombre: 'Arepa de queso', precio: '4000.00', imagenes: [] },
      ],
    });
    mocks.listarPuestos.mockReset().mockResolvedValue({ results: [{ id: 4, nombre: 'Palenque de Carmen', direccion: 'Mercado Viejo' }] });
  });

  it('no sugiere nada con menos de dos letras', async () => {
    const caja = montar();
    fireEvent.change(caja, { target: { value: 'a' } });
    await new Promise((resolver) => setTimeout(resolver, 350));
    expect(mocks.listarProductos).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('muestra productos y puestos al escribir y abre el marcado con flechas y Enter', async () => {
    const caja = montar();
    fireEvent.change(caja, { target: { value: 'are' } });

    expect(await screen.findByRole('option', { name: /Arepa de huevo/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Palenque de Carmen/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Ver todos los resultados para «are»/ })).toBeInTheDocument();
    expect(mocks.listarProductos).toHaveBeenCalledWith({ q: 'are', page_size: 5 });

    fireEvent.keyDown(caja, { key: 'ArrowDown' });
    fireEvent.keyDown(caja, { key: 'ArrowDown' });
    expect(caja).toHaveAttribute('aria-activedescendant', expect.stringContaining('p-10'));
    fireEvent.submit(caja.closest('form')!);

    expect(screen.getByTestId('ruta')).toHaveTextContent('/productos/10');
  });

  it('sin nada marcado, Enter busca en el catálogo con lo escrito y la categoría', async () => {
    const caja = montar();
    fireEvent.change(screen.getByLabelText('Categoría de búsqueda'), { target: { value: '3' } });
    fireEvent.change(caja, { target: { value: 'jugo' } });
    await screen.findByRole('listbox');

    fireEvent.submit(caja.closest('form')!);

    expect(screen.getByTestId('ruta')).toHaveTextContent('/catalogo?q=jugo&categoria=3');
  });

  it('Escape cierra las sugerencias', async () => {
    const caja = montar();
    fireEvent.change(caja, { target: { value: 'are' } });
    await screen.findByRole('listbox');

    fireEvent.keyDown(caja, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(caja).toHaveAttribute('aria-expanded', 'false');
  });

  it('un clic en una sugerencia abre ese puesto', async () => {
    const caja = montar();
    fireEvent.change(caja, { target: { value: 'pal' } });

    // El resaltado parte el nombre en dos nodos («Pal» + «enque…»); el cálculo del nombre accesible los separa.
    fireEvent.click(await screen.findByRole('option', { name: /Pal\s?enque de Carmen/ }));

    expect(screen.getByTestId('ruta')).toHaveTextContent('/puestos/4');
  });
});
