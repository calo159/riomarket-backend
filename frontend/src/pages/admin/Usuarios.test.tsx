import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsuarioAdmin } from '../../api/admin';
import { Usuarios } from './Usuarios';

const mocks = vi.hoisted(() => ({
  listarUsuarios: vi.fn(),
  listarRoles: vi.fn(),
  cambiarRolUsuario: vi.fn(),
  asignarRolesUsuario: vi.fn(),
  suspenderUsuario: vi.fn(),
  reactivarUsuario: vi.fn(),
}));

vi.mock('../../api/admin', () => mocks);

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
  roles_asignados: [
    { id: 1, nombre: 'comprador', es_sistema: true },
    { id: 9, nombre: 'moderador', es_sistema: false },
  ],
  acciones_permitidas: ['cambiar-rol', 'roles', 'suspender'],
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

async function abrirModal() {
  await screen.findAllByText('Ana Pérez');
  await userEvent.click(screen.getAllByRole('button', { name: /Gestionar acceso/ })[0]);
  return screen.getByRole('dialog');
}

describe('Usuarios (administración)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listarUsuarios.mockResolvedValue({ count: 1, next: null, previous: null, results: [USUARIO] });
    mocks.listarRoles.mockResolvedValue([
      { id: 1, nombre: 'comprador', descripcion: '', activo: true, es_sistema: true, total_usuarios: 1, total_recursos: 3, recursos: [] },
      { id: 9, nombre: 'moderador', descripcion: '', activo: true, es_sistema: false, total_usuarios: 1, total_recursos: 2, recursos: [] },
      { id: 10, nombre: 'soporte', descripcion: '', activo: true, es_sistema: false, total_usuarios: 0, total_recursos: 1, recursos: [] },
    ]);
  });

  it('muestra los chips de roles adicionales de cada cuenta', async () => {
    renderizar();
    await screen.findAllByText('Ana Pérez');
    expect(screen.getAllByText('moderador').length).toBeGreaterThan(0);
  });

  it('exige motivo antes de banear', async () => {
    renderizar();
    const dialogo = await abrirModal();
    await userEvent.click(within(dialogo).getByRole('button', { name: /Suspender cuenta/ }));

    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Indica un motivo de al menos 5 caracteres.');
    expect(mocks.suspenderUsuario).not.toHaveBeenCalled();
  });

  it('muestra el error del backend al banear', async () => {
    mocks.suspenderUsuario.mockRejectedValue(errorBackend('No puedes suspender al último administrador.'));
    renderizar();
    const dialogo = await abrirModal();
    await userEvent.type(within(dialogo).getByLabelText(/Motivo del baneo/), 'Incumplió las normas');
    await userEvent.click(within(dialogo).getByRole('button', { name: /Suspender cuenta/ }));

    await waitFor(() =>
      expect(within(dialogo).getByRole('alert')).toHaveTextContent('No puedes suspender al último administrador.'),
    );
    expect(mocks.suspenderUsuario).toHaveBeenCalledWith(7, 'Incumplió las normas');
  });

  it('exige motivo para cambiar el rol base y lo envía cuando existe', async () => {
    mocks.cambiarRolUsuario.mockResolvedValue({ ...USUARIO, rol: 'vendedor' });
    renderizar();
    const dialogo = await abrirModal();

    await userEvent.click(within(dialogo).getByRole('button', { name: /Cambiar rol base/ }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('al menos 5 caracteres');
    expect(mocks.cambiarRolUsuario).not.toHaveBeenCalled();

    await userEvent.type(within(dialogo).getByLabelText(/Motivo del cambio de rol/), 'Ahora vende frutas');
    await userEvent.click(within(dialogo).getByRole('button', { name: /Cambiar rol base/ }));
    await waitFor(() =>
      expect(mocks.cambiarRolUsuario).toHaveBeenCalledWith(7, { rol: 'vendedor', motivo: 'Ahora vende frutas' }),
    );
  });

  it('guarda los roles adicionales marcados con su motivo', async () => {
    mocks.asignarRolesUsuario.mockResolvedValue(USUARIO);
    renderizar();
    const dialogo = await abrirModal();

    expect(within(dialogo).getByRole('checkbox', { name: 'moderador' })).toBeChecked();
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: 'soporte' }));
    await userEvent.type(within(dialogo).getByLabelText(/Motivo de los roles adicionales/), 'Equipo de soporte');
    await userEvent.click(within(dialogo).getByRole('button', { name: /Guardar roles adicionales/ }));

    await waitFor(() =>
      expect(mocks.asignarRolesUsuario).toHaveBeenCalledWith(7, {
        roles: expect.arrayContaining([9, 10]),
        motivo: 'Equipo de soporte',
      }),
    );
  });

  it('solo muestra las secciones que permite acciones_permitidas', async () => {
    mocks.listarUsuarios.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{ ...USUARIO, estado: 'suspendido', acciones_permitidas: ['reactivar'] }],
    });
    renderizar();
    const dialogo = await abrirModal();
    expect(within(dialogo).getByRole('button', { name: /Reactivar cuenta/ })).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: /Cambiar rol base/ })).not.toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: /Guardar roles adicionales/ })).not.toBeInTheDocument();
  });
});
