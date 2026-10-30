import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { api } from '../lib/http';
import { useMenu } from './useMenu';

vi.mock('../auth/SessionProvider', () => ({
  useSession: () => ({ autenticado: false, rol: null }),
}));

vi.mock('../lib/http', () => ({
  api: { get: vi.fn() },
}));

function envolver(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useMenu', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('entrega el menú del backend cuando responde', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        rol: 'comprador',
        inicio: '/',
        publico: [{ to: '/catalogo', etiqueta: 'Catálogo', icono: 'ShoppingBag' }],
        cuenta: [],
        panel: [],
        panel_titulo: null,
        badges: { notificaciones: 2 },
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useMenu(), { wrapper: envolver(client) });

    await waitFor(() => expect(result.current.menu.rol).toBe('comprador'));
    expect(result.current.badges.notificaciones).toBe(2);
  });

  it('usa el menú mínimo si la API falla', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('sin conexión'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useMenu(), { wrapper: envolver(client) });

    expect(result.current.menu.publico.map((enlace) => enlace.etiqueta)).toEqual(['Catálogo', 'Carrito']);
    expect(result.current.menu.cuenta.map((enlace) => enlace.etiqueta)).toEqual(['Ingresar']);

    await waitFor(() => expect(result.current.error).toBe(true), { timeout: 3000 });
    expect(result.current.menu.publico).toHaveLength(2);
  });
});
