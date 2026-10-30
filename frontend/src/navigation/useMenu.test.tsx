import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { api } from '../lib/http';
import { useAcceso, useMenu } from './useMenu';

vi.mock('../auth/SessionProvider', () => ({
  useSession: () => ({ autenticado: true, usuario: { id: 1, rol: 'comprador' } }),
}));

vi.mock('../lib/http', () => ({
  api: { get: vi.fn() },
}));

function envolver(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('useMenu', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('entrega el menú del backend y sus badges', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        rol: 'comprador',
        roles: ['comprador'],
        recursos: ['catalogo', 'mis_pedidos'],
        items: [],
        badges: { notificaciones: 2 },
      },
    });
    const { result } = renderHook(() => useMenu(), { wrapper: envolver(nuevoCliente()) });

    await waitFor(() => expect(result.current.menu.rol).toBe('comprador'));
    expect(result.current.badges.notificaciones).toBe(2);
  });

  it('usa el menú mínimo (solo Catálogo) si la API falla', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('sin conexión'));
    const { result } = renderHook(() => useMenu(), { wrapper: envolver(nuevoCliente()) });

    expect(result.current.menu.items.map((i) => i.nombre)).toEqual(['Catálogo']);
    await waitFor(() => expect(result.current.error).toBe(true), { timeout: 3000 });
    expect(result.current.menu.items).toHaveLength(1);
  });

  it('useAcceso expone los recursos efectivos', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { rol: 'comprador', roles: [], recursos: ['catalogo', 'admin.puestos'], items: [], badges: {} },
    });
    const { result } = renderHook(() => useAcceso(), { wrapper: envolver(nuevoCliente()) });

    await waitFor(() => expect(result.current.tiene('admin.puestos')).toBe(true));
    expect(result.current.tiene('admin.usuarios')).toBe(false);
  });
});
