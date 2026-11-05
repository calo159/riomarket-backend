import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Producto } from '../lib/types';
import { abreviarUnidad, ProductoCard } from './ProductoCard';

const mocks = vi.hoisted(() => ({ agregar: vi.fn(() => 'agregado'), obtenerPuesto: vi.fn() }));

vi.mock('../cart/CartProvider', () => ({ useCart: () => ({ agregar: mocks.agregar }) }));
vi.mock('./ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../api/catalog', () => ({ obtenerPuesto: mocks.obtenerPuesto }));
vi.mock('../lib/volarAlCarrito', () => ({ volarAlCarrito: vi.fn() }));

const puesto = { id: 5, nombre: 'Dulces de Carmen', ofrece_domicilio: true } as never;

function producto(extra: Record<string, unknown> = {}): Producto {
  return {
    id: 9,
    id_puesto: 5,
    id_categoria: 1,
    nombre: 'Torta de chocolate',
    precio: '50000.00',
    stock: 0,
    unidad_medida: 'unidad',
    estado: 'activo',
    imagenes: [],
    ...extra,
  } as unknown as Producto;
}

function renderizar(p: Producto, extra: { ocultarPuesto?: boolean; puesto?: unknown } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProductoCard producto={p} puesto={(extra.puesto ?? puesto) as never} ocultarPuesto={extra.ocultarPuesto} />} />
          <Route path="/productos/:id" element={<p>Detalle del producto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductoCard', () => {
  beforeEach(() => mocks.agregar.mockClear());

  it('encargo_muestra_por_encargo_y_no_agotado', () => {
    renderizar(producto({ modalidad: 'encargo', preparacion_horas: 48, pide_detalles: false }));
    expect(screen.getByText('Por encargo · 2 días')).toBeInTheDocument();
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument();
    expect(screen.queryByText(/Quedan/)).not.toBeInTheDocument();
    // Sin detalles que pedir se agrega como siempre.
    const boton = screen.getAllByRole('button', { name: 'Agregar Torta de chocolate al carrito' })[0];
    expect(boton).toBeEnabled();
  });

  it('un encargo con detalles lleva al producto en vez de agregar', () => {
    renderizar(producto({ modalidad: 'encargo', preparacion_horas: 24, pide_detalles: true }));
    expect(screen.getByText('Por encargo · 24 h')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Encargar Torta de chocolate' })[0]);
    expect(screen.getByText('Detalle del producto')).toBeInTheDocument();
    expect(mocks.agregar).not.toHaveBeenCalled();
  });

  it('un producto con stock 0 sigue figurando como agotado', () => {
    renderizar(producto({ modalidad: 'stock', stock: 0 }));
    expect(screen.getAllByText('Agotado').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Por encargo/)).not.toBeInTheDocument();
  });

  it('un producto con pocas existencias sigue mostrando «Quedan N»', () => {
    renderizar(producto({ modalidad: 'stock', stock: 3 }));
    expect(screen.getByText('Quedan 3')).toBeInTheDocument();
  });

  it('un producto antiguo sin modalidad se trata como de stock', () => {
    renderizar(producto({ stock: 4 }));
    expect(screen.getByText('Quedan 4')).toBeInTheDocument();
  });

  it('muestra_el_puesto_y_su_calificacion_en_el_catalogo', () => {
    renderizar(producto(), { puesto: { id: 5, nombre: 'Dulces de Carmen', ofrece_domicilio: true, calificacion_promedio: 4.5 } });

    expect(screen.getByText('Dulces de Carmen')).toBeInTheDocument();
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
  });

  it('en_la_pagina_del_puesto_no_repite_su_nombre_ni_su_calificacion', () => {
    renderizar(producto(), {
      ocultarPuesto: true,
      puesto: { id: 5, nombre: 'Dulces de Carmen', ofrece_domicilio: false, calificacion_promedio: 4.5 },
    });

    expect(screen.queryByText('Dulces de Carmen')).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo retiro/)).not.toBeInTheDocument();
  });

  it('el_domicilio_es_lo_normal_y_solo_se_avisa_cuando_falta', () => {
    const { unmount } = renderizar(producto(), { puesto: { id: 5, nombre: 'Dulces de Carmen', ofrece_domicilio: true } });
    expect(screen.queryByText(/Domicilio disponible/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo retiro/)).not.toBeInTheDocument();
    unmount();

    renderizar(producto(), { puesto: { id: 5, nombre: 'Dulces de Carmen', ofrece_domicilio: false } });
    expect(screen.getByText('Solo retiro en el puesto')).toBeInTheDocument();
  });
});

describe('abreviarUnidad', () => {
  it('abrevia_las_unidades_largas_para_la_etiqueta_del_celular', () => {
    expect(abreviarUnidad('unidad')).toBe('un.');
    expect(abreviarUnidad('Docena')).toBe('doc.');
    expect(abreviarUnidad('libra')).toBe('lb');
  });

  it('deja_igual_las_que_ya_son_cortas_o_desconocidas', () => {
    expect(abreviarUnidad('kg')).toBe('kg');
    expect(abreviarUnidad('racimo')).toBe('racimo');
  });
});
