import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecursoAdmin, RolAdmin } from '../../api/admin';
import { RolesAdmin } from './RolesAdmin';

const mocks = vi.hoisted(() => ({
  listarRoles: vi.fn(),
  listarRecursos: vi.fn(),
  crearRol: vi.fn(),
  actualizarRol: vi.fn(),
  eliminarRol: vi.fn(),
  fijarRecursosRol: vi.fn(),
}));

vi.mock('../../api/admin', async (original) => ({
  ...(await original<typeof import('../../api/admin')>()),
  ...mocks,
}));
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock('../../navigation/useMenu', () => ({ invalidarMenu: vi.fn() }));

function recurso(id: number, codigo: string, nombre: string, grupo = 'Accesos'): RecursoAdmin {
  return {
    id,
    codigo,
    nombre,
    descripcion: '',
    ambito: 'panel_admin',
    ruta: `/${codigo}`,
    icono: '',
    grupo,
    orden: id,
    es_publico: false,
    es_sistema: true,
    activo: true,
    total_roles: 1,
  };
}

const RECURSOS = [
  recurso(1, 'admin.usuarios', 'Usuarios'),
  recurso(2, 'admin.roles', 'Roles'),
  recurso(3, 'admin.recursos', 'Recursos'),
  recurso(4, 'admin.resumen', 'Resumen', ''),
  recurso(5, 'admin.auditoria', 'Auditoría', 'Sistema'),
];

const ADMIN: RolAdmin = {
  id: 3, nombre: 'administrador', descripcion: '', activo: true, es_sistema: true,
  total_usuarios: 1, total_recursos: 5, recursos: [1, 2, 3, 4, 5],
};
const MODERADOR: RolAdmin = {
  id: 9, nombre: 'moderador', descripcion: 'Modera', activo: true, es_sistema: false,
  total_usuarios: 2, total_recursos: 1, recursos: [5],
};

function errorBackend(mensaje: string): AxiosError {
  const respuesta = {
    data: { errors: { rol: [mensaje] } },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RolesAdmin />
    </QueryClientProvider>,
  );
}

describe('RolesAdmin', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listarRoles.mockResolvedValue([ADMIN, MODERADOR]);
    mocks.listarRecursos.mockResolvedValue(RECURSOS);
  });

  it('marca los roles de sistema y no ofrece eliminarlos', async () => {
    renderizar();
    await screen.findByText('moderador');
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Eliminar/ })).toHaveLength(1);
  });

  it('bloquea las casillas obligatorias del rol administrador', async () => {
    renderizar();
    await screen.findByText('moderador');
    await userEvent.click(screen.getAllByRole('button', { name: /Permisos/ })[0]);
    const dialogo = screen.getByRole('dialog');

    for (const nombre of ['Usuarios', 'Roles', 'Recursos', 'Resumen']) {
      expect(within(dialogo).getByRole('checkbox', { name: new RegExp(nombre) })).toBeDisabled();
    }
    expect(within(dialogo).getByRole('checkbox', { name: /Auditoría/ })).toBeEnabled();
  });

  it('exige motivo para guardar permisos y envía los recursos marcados', async () => {
    mocks.fijarRecursosRol.mockResolvedValue(MODERADOR);
    renderizar();
    await screen.findByText('moderador');
    await userEvent.click(screen.getAllByRole('button', { name: /Permisos/ })[1]);
    const dialogo = screen.getByRole('dialog');

    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Usuarios/ }));
    await userEvent.click(within(dialogo).getByRole('button', { name: /Guardar permisos/ }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('al menos 5 caracteres');
    expect(mocks.fijarRecursosRol).not.toHaveBeenCalled();

    await userEvent.type(within(dialogo).getByLabelText(/Motivo/), 'Equipo de moderación');
    await userEvent.click(within(dialogo).getByRole('button', { name: /Guardar permisos/ }));
    await waitFor(() =>
      expect(mocks.fijarRecursosRol).toHaveBeenCalledWith(9, {
        recursos: expect.arrayContaining([1, 5]),
        motivo: 'Equipo de moderación',
      }),
    );
  });

  it('muestra el error del backend al eliminar un rol con usuarios', async () => {
    mocks.eliminarRol.mockRejectedValue(
      errorBackend('El rol tiene 2 usuario(s) asignado(s). Quítaselo primero o desactívalo.'),
    );
    renderizar();
    await screen.findByText('moderador');
    await userEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: /^Eliminar$/ }));

    await waitFor(() => expect(within(dialogo).getByText(/tiene 2 usuario/)).toBeInTheDocument());
  });

  it('la matriz usa el mismo endpoint y bloquea las celdas obligatorias', async () => {
    mocks.fijarRecursosRol.mockResolvedValue(MODERADOR);
    renderizar();
    await screen.findByText('moderador');
    await userEvent.click(screen.getByRole('tab', { name: 'Matriz' }));

    expect(screen.getByRole('checkbox', { name: 'administrador puede abrir Roles' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'moderador puede abrir Usuarios' }));
    await waitFor(() =>
      expect(mocks.fijarRecursosRol).toHaveBeenCalledWith(9, {
        recursos: expect.arrayContaining([1, 5]),
        motivo: expect.stringMatching(/matriz/),
      }),
    );
  });
});
