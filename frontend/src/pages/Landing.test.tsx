import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rol } from '../lib/types';
import { Landing } from './Landing';

const sesion = vi.hoisted(() => ({
  estado: 'anonimo' as 'cargando' | 'anonimo' | 'autenticado',
  rol: null as Rol | null,
}));
const mocks = vi.hoisted(() => ({ listarPuestos: vi.fn() }));

vi.mock('../auth/SessionProvider', () => ({ useSession: () => sesion }));
vi.mock('../api/catalog', () => ({ listarPuestos: mocks.listarPuestos }));

const puesto = (id: number, nombre: string) => ({ id, nombre, portada: null, categorias: [{ id: 1, nombre: 'Frutas' }] });

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tienda" element={<p>página de la tienda</p>} />
          <Route path="/vendedor" element={<p>panel del vendedor</p>} />
          <Route path="/admin" element={<p>panel del administrador</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Landing', () => {
  beforeEach(() => {
    sesion.estado = 'anonimo';
    sesion.rol = null;
    mocks.listarPuestos.mockReset();
    mocks.listarPuestos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it('se muestra con un solo h1 y los enlaces principales', () => {
    montar();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Haz el mercado desde el celular.');
    const destinos = (nombre: string) =>
      screen.getAllByRole('link', { name: nombre }).map((enlace) => enlace.getAttribute('href'));
    expect(destinos('Ir a la tienda')).toContain('/tienda');
    expect(destinos('Ingresar')).toContain('/login');
    expect(screen.getByRole('link', { name: 'Abrir mi puesto' })).toHaveAttribute('href', '/registro?rol=vendedor');
    expect(screen.getByRole('link', { name: 'Créditos de fotos' })).toHaveAttribute('href', '/creditos-fotos');
  });

  it('el interruptor cambia los pasos y marca aria-selected', async () => {
    const usuario = userEvent.setup();
    montar();
    const comprar = screen.getByRole('tab', { name: 'Vengo a comprar' });
    const vender = screen.getByRole('tab', { name: 'Tengo un puesto' });
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(comprar).toHaveAttribute('aria-selected', 'true');
    expect(vender).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { name: 'Busca lo que te hace falta' })).toBeInTheDocument();

    await usuario.click(vender);
    expect(vender).toHaveAttribute('aria-selected', 'true');
    expect(comprar).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { name: 'Verifica tu identidad' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Busca lo que te hace falta' })).not.toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('link', { name: /Crear mi cuenta de vendedor/ })).toHaveAttribute(
      'href',
      '/registro?rol=vendedor',
    );
  });

  it('el interruptor responde a las flechas del teclado', async () => {
    const usuario = userEvent.setup();
    montar();
    screen.getByRole('tab', { name: 'Vengo a comprar' }).focus();
    await usuario.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tengo un puesto' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tengo un puesto' })).toHaveFocus();
    await usuario.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Vengo a comprar' })).toHaveAttribute('aria-selected', 'true');
  });

  it('muestra los puestos reales con enlace a su página', async () => {
    mocks.listarPuestos.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [puesto(4, 'Frutas del Caribe'), puesto(9, 'Dulces de Carmen')],
    });
    montar();
    const enlace = await screen.findByRole('link', { name: /Frutas del Caribe/ });
    expect(enlace).toHaveAttribute('href', '/puestos/4');
    expect(screen.getByRole('link', { name: /Dulces de Carmen/ })).toHaveAttribute('href', '/puestos/9');
  });

  it('sin puestos no se rompe y avisa', async () => {
    montar();
    expect(await screen.findByText(/Todavía no hay puestos publicados/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver todos los puestos/ })).toHaveAttribute('href', '/tienda');
  });

  it('si los puestos fallan, la landing sigue entera', async () => {
    mocks.listarPuestos.mockRejectedValue(new Error('sin red'));
    montar();
    expect(await screen.findByText(/No pudimos cargar los puestos/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('mientras la sesión carga no se ve la landing', () => {
    sesion.estado = 'cargando';
    montar();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText('Cargando RioMarket…')).toBeInTheDocument();
  });

  it.each([
    ['comprador', 'página de la tienda'],
    ['vendedor', 'panel del vendedor'],
    ['administrador', 'panel del administrador'],
  ] as const)('con sesión de %s redirige a su inicio', (rol, texto) => {
    sesion.estado = 'autenticado';
    sesion.rol = rol;
    montar();
    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
