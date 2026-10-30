import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsuarioAdmin } from '../../api/admin';
import { Usuarios } from './Usuarios';

const mocks = vi.hoisted(() => ({
  listarUsuarios: vi.fn(),
  cambiarRolUsuario: vi.fn(),
  suspenderUsuario: vi.fn(),
  reactivarUsuario: vi.fn(),
}));

vi.mock('../../api/admin', () => ({
  listarUsuarios: mocks.listarUsuarios,
  cambiarRolUsuario: mocks.cambiarRolUsuario,
  suspenderUsuario: mocks.suspenderUsuario,
  reactivarUsuario: mocks.reactivarUsuario,
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('../../navigation/useMenu', () => ({
  invalidarMenu: vi.fn(),
}));

const USUARIO: UsuarioAdmin = {
  id: 7,
  nombre: 'Ana Pérez',
  correo: 'ana@example.com',
  celular: '3001234567',
  rol: 'comprador',
  estado: 'activo',
  fecha_registro: '2026-01-15T10:00:00Z',
  estado_verificacion: null,
  pedidos_como_comprador: 2,
  pedidos_activos: 0,
  puestos: [],
  acciones_permitidas: ['cambiar-rol', 'suspender'],
};

function errorBackend(mensaje: string): AxiosError {
  const respuesta = {
    data: { errors: { motivo: [mensaje] } },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Usuarios />
    </QueryClientProvider>,
  );
}

describe('Usuarios (administración)', () => {
  beforeEach(() => {
    mocks.listarUsuarios.mockReset();
    mocks.cambiarRolUsuario.mockReset();
    mocks.suspenderUsuario.mockReset();
    mocks.reactivarUsuario.mockReset();
    mocks.listarUsuarios.mockResolvedValue({ count: 1, next: null, previous: null, results: [USUARIO] });
  });

  it('exige motivo antes de suspender una cuenta', async () => {
    renderizar();
    await screen.findAllByText('Ana Pérez');

    await userEvent.click(screen.getAllByRole('button', { name: /Banear/ })[0]);
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: /Suspender cuenta/ }));

    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Indica un motivo de al menos 5 caracteres.');
    expect(mocks.suspenderUsuario).not.toHaveBeenCalled();
  });

  it('muestra el error del backend al suspender', async () => {
    mocks.suspenderUsuario.mockRejectedValue(errorBackend('No puedes suspender al último administrador.'));
    renderizar();
    await screen.findAllByText('Ana Pérez');

    await userEvent.click(screen.getAllByRole('button', { name: /Banear/ })[0]);
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/Motivo/), 'Incumplió las normas');
    await userEvent.click(within(dialogo).getByRole('button', { name: /Suspender cuenta/ }));

    await waitFor(() =>
      expect(within(dialogo).getByRole('alert')).toHaveTextContent('No puedes suspender al último administrador.'),
    );
    expect(mocks.suspenderUsuario).toHaveBeenCalledWith(7, 'Incumplió las normas');
  });
});
