import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecursoAdmin } from '../../api/admin';
import type { MenuItem, MenuRespuesta } from '../../navigation/tipos';
import { PanelLayout } from './PanelLayout';

const mocks = vi.hoisted(() => ({
  listarRecursos: vi.fn(),
  actualizarRecurso: vi.fn(),
  invalidarMenu: vi.fn(),
  menu: null as unknown as MenuRespuesta,
}));

vi.mock('../../api/admin', async (original) => ({
  ...(await original<typeof import('../../api/admin')>()),
  listarRecursos: mocks.listarRecursos,
  actualizarRecurso: mocks.actualizarRecurso,
}));
vi.mock('../../lib/invalidarMenu', () => ({ invalidarMenu: mocks.invalidarMenu }));
vi.mock('../../navigation/useMenu', () => ({ useMenu: () => ({ menu: mocks.menu, badges: {} }) }));
vi.mock('../../auth/SessionProvider', () => ({
  useSession: () => ({ usuario: { id: 1, nombre: 'Admin Rio', rol: 'administrador' }, cerrarSesion: vi.fn() }),
}));
vi.mock('./NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../ui/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('../ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

function item(codigo: string, nombre: string, ruta: string, grupo: string, orden: number, icono = 'Users'): MenuItem {
  return { codigo, nombre, ruta, icono, ambito: 'panel_admin', grupo, orden };
}

function recurso(extra: Partial<RecursoAdmin>): RecursoAdmin {
  return {
    id: 11,
    codigo: 'admin.usuarios',
    nombre: 'Usuarios',
    descripcion: '',
    ambito: 'panel_admin',
    ruta: '/admin/usuarios',
    icono: 'Users',
    grupo: 'Accesos',
    orden: 1,
    es_publico: false,
    es_sistema: true,
    activo: true,
    total_roles: 1,
    ...extra,
  };
}

function menuDe(recursos: string[]): MenuRespuesta {
  return {
    rol: 'administrador',
    roles: ['administrador'],
    recursos,
    items: [
      item('admin.resumen', 'Resumen', '/admin', '', 1, 'LayoutDashboard'),
      item('admin.usuarios', 'Usuarios', '/admin/usuarios', 'Accesos', 1),
      item('admin.roles', 'Roles', '/admin/roles', 'Accesos', 2, 'KeyRound'),
    ],
    badges: {},
  };
}

function errorBackend(campo: string, mensaje: string): AxiosError {
  const respuesta = { data: { errors: { [campo]: [mensaje] }, success: false }, status: 400, statusText: 'Bad Request', headers: {}, config: {} } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <Routes>
          <Route element={<PanelLayout />}>
            <Route path="admin/*" element={<p>contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const TODOS = ['admin.resumen', 'admin.usuarios', 'admin.roles', 'admin.recursos'];

beforeEach(() => {
  mocks.menu = menuDe(TODOS);
  mocks.listarRecursos.mockReset().mockResolvedValue([
    recurso({}),
    recurso({ id: 10, codigo: 'admin.resumen', nombre: 'Resumen', ruta: '/admin', icono: 'LayoutDashboard', grupo: '', orden: 1 }),
    recurso({ id: 12, codigo: 'admin.roles', nombre: 'Roles', ruta: '/admin/roles', icono: 'KeyRound', orden: 2 }),
  ]);
  mocks.actualizarRecurso.mockReset().mockResolvedValue({});
  mocks.invalidarMenu.mockReset().mockResolvedValue(undefined);
});

describe('PanelLayout: editar el menú desde la barra', () => {
  it('sin el recurso admin.recursos no hay nada para editar', () => {
    mocks.menu = menuDe(['admin.resumen', 'admin.usuarios']);
    renderizar();

    expect(screen.getByRole('link', { name: /Usuarios/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar menú' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar «/ })).not.toBeInTheDocument();
    expect(mocks.listarRecursos).not.toHaveBeenCalled();
  });

  it('con el permiso, el botón activa los lápices y se puede desactivar', async () => {
    renderizar();
    const boton = screen.getByRole('button', { name: 'Editar menú' });
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /^Editar «/ })).not.toBeInTheDocument();

    await userEvent.click(boton);

    expect(screen.getByRole('button', { name: 'Terminar de editar' })).toHaveAttribute('aria-pressed', 'true');
    for (const nombre of ['Resumen', 'Usuarios', 'Roles']) {
      expect(screen.getByRole('button', { name: `Editar «${nombre}»` })).toBeInTheDocument();
    }
    // Los enlaces siguen siendo enlaces: editar no impide navegar.
    expect(screen.getByRole('link', { name: /Roles/ })).toHaveAttribute('href', '/admin/roles');

    await userEvent.click(screen.getByRole('button', { name: 'Terminar de editar' }));
    expect(screen.queryByRole('button', { name: /^Editar «/ })).not.toBeInTheDocument();
  });

  it('el lápiz abre solo nombre, icono, grupo y orden (nada que toque los permisos)', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar menú' }));
    await waitFor(() => expect(mocks.listarRecursos).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Editar «Usuarios»' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Editar «Usuarios» en el menú' });
    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue('Usuarios');
    expect(within(dialogo).getByLabelText('Icono')).toHaveValue('Users');
    expect(within(dialogo).getByLabelText('Grupo del menú')).toHaveValue('Accesos');
    expect(within(dialogo).getByLabelText('Orden')).toHaveValue(1);
    for (const prohibido of ['Código', 'Ámbito', 'Ruta', 'Descripción', 'Activo', 'Visible sin sesión']) {
      expect(within(dialogo).queryByLabelText(prohibido)).not.toBeInTheDocument();
    }
  });

  it('guarda solo lo visual, vuelve a pedir el menú y cierra la ventana', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar menú' }));
    await waitFor(() => expect(mocks.listarRecursos).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Editar «Usuarios»' }));
    const dialogo = await screen.findByRole('dialog');

    const nombre = within(dialogo).getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Cuentas');
    await userEvent.selectOptions(within(dialogo).getByLabelText('Icono'), 'Store');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(mocks.actualizarRecurso).toHaveBeenCalledWith(11, { nombre: 'Cuentas', icono: 'Store', grupo: 'Accesos', orden: 1 }),
    );
    await waitFor(() => expect(mocks.invalidarMenu).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('un nombre vacío no llega al servidor', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar menú' }));
    await waitFor(() => expect(mocks.listarRecursos).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Editar «Roles»' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.clear(within(dialogo).getByLabelText('Nombre'));
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialogo).findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(mocks.actualizarRecurso).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza el cambio lo dice en la misma ventana y no la cierra ni toca el menú', async () => {
    mocks.actualizarRecurso.mockRejectedValue(errorBackend('nombre', 'Ya existe una opción con ese nombre.'));
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar menú' }));
    await waitFor(() => expect(mocks.listarRecursos).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Editar «Usuarios»' }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect((await within(dialogo).findAllByText(/Ya existe una opción con ese nombre/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocks.invalidarMenu).not.toHaveBeenCalled();
  });

  it('sugiere los grupos que ya existen en el panel para no inventar uno por un error de tipeo', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar menú' }));
    await waitFor(() => expect(mocks.listarRecursos).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Editar «Usuarios»' }));
    const dialogo = await screen.findByRole('dialog');

    const grupo = within(dialogo).getByLabelText('Grupo del menú');
    const lista = document.getElementById(grupo.getAttribute('list') ?? '');
    expect(lista?.querySelectorAll('option')).toHaveLength(1);
    expect(lista?.querySelector('option')).toHaveAttribute('value', 'Accesos');
  });
});
