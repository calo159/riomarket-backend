import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsuarioAdmin, UsuarioCreado } from '../../api/admin';
import { EditarCuenta } from './EditarCuenta';

const mocks = vi.hoisted(() => ({ editarDatosUsuario: vi.fn(), restablecerContrasenaUsuario: vi.fn() }));
const toast = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../api/admin', () => mocks);
vi.mock('../../components/ui/Toast', () => ({ useToast: () => toast }));

const USUARIO: UsuarioAdmin = {
  id: 7,
  nombre: 'Ana Pérez',
  correo: 'ana@example.com',
  celular: '3001234567',
  rol: 'comprador',
  estado: 'activo',
  fecha_registro: '2026-01-15T10:00:00Z',
  estado_verificacion: null,
  pedidos_como_comprador: 0,
  pedidos_activos: 0,
  puestos: [],
  roles_asignados: [],
  acciones_permitidas: ['editar-datos', 'restablecer-contrasena', 'suspender'],
};

function errorBackend(errors: Record<string, string[]>): AxiosError {
  const respuesta = { data: { errors }, status: 400, statusText: 'Bad Request', headers: {}, config: {} } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

function renderizar(usuario: UsuarioAdmin = USUARIO, onCambio = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EditarCuenta usuario={usuario} onCerrar={vi.fn()} onCambio={onCambio} />
    </QueryClientProvider>,
  );
  return onCambio;
}

beforeEach(() => {
  mocks.editarDatosUsuario.mockReset().mockResolvedValue(USUARIO);
  mocks.restablecerContrasenaUsuario.mockReset().mockResolvedValue({ ...USUARIO, password_temporal: 'Zq8wLm3KtV9x' } as UsuarioCreado);
  Object.values(toast).forEach((mock) => mock.mockReset());
});

describe('EditarCuenta: datos', () => {
  it('parte de los datos actuales y guarda solo con motivo', async () => {
    const onCambio = renderizar();
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText('Nombre completo')).toHaveValue('Ana Pérez');
    expect(within(dialogo).getByLabelText('Correo')).toHaveValue('ana@example.com');

    await userEvent.clear(within(dialogo).getByLabelText('Celular'));
    await userEvent.type(within(dialogo).getByLabelText('Celular'), '3105559999');
    await userEvent.type(within(dialogo).getByLabelText(/Motivo del cambio/), 'Cambió de número');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar datos' }));

    await waitFor(() =>
      expect(mocks.editarDatosUsuario).toHaveBeenCalledWith(7, {
        nombre: 'Ana Pérez',
        correo: 'ana@example.com',
        celular: '3105559999',
        motivo: 'Cambió de número',
      }),
    );
    expect(onCambio).toHaveBeenCalled();
    expect(toast.exito).toHaveBeenCalledWith('Datos de Ana Pérez actualizados.');
  });

  it('sin motivo no llega al servidor', async () => {
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar datos' }));

    expect(await screen.findByText('Indica un motivo de al menos 5 caracteres.')).toBeInTheDocument();
    expect(mocks.editarDatosUsuario).not.toHaveBeenCalled();
  });

  it('el error del servidor sale bajo el campo (correo repetido)', async () => {
    mocks.editarDatosUsuario.mockRejectedValue(errorBackend({ correo: ['Ya existe una cuenta con ese correo.'] }));
    renderizar();
    const dialogo = await screen.findByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/Motivo del cambio/), 'Corrección');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar datos' }));

    expect(await within(dialogo).findByText('Ya existe una cuenta con ese correo.')).toBeInTheDocument();
  });
});

describe('EditarCuenta: restablecer contraseña', () => {
  it('muestra la contraseña temporal una sola vez, con el motivo enviado', async () => {
    const onCambio = renderizar();
    const dialogo = await screen.findByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText(/Motivo \(obligatorio\)/), 'Olvidó la suya');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restablecer contraseña' }));

    await waitFor(() => expect(mocks.restablecerContrasenaUsuario).toHaveBeenCalledWith(7, 'Olvidó la suya'));
    expect(await within(dialogo).findByLabelText('Contraseña temporal')).toHaveValue('Zq8wLm3KtV9x');
    expect(within(dialogo).getByText(/no se vuelve a mostrar/)).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'Restablecer contraseña' })).not.toBeInTheDocument();
    expect(onCambio).toHaveBeenCalled();
  });

  it('sin motivo no llega al servidor', async () => {
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Restablecer contraseña' }));

    expect(await screen.findByText('Indica un motivo de al menos 5 caracteres.')).toBeInTheDocument();
    expect(mocks.restablecerContrasenaUsuario).not.toHaveBeenCalled();
  });
});

describe('EditarCuenta: permisos', () => {
  it('solo muestra las secciones que el servidor permite', async () => {
    renderizar({ ...USUARIO, acciones_permitidas: ['restablecer-contrasena'] });
    await screen.findByRole('dialog');

    expect(screen.queryByRole('heading', { name: /Datos de la cuenta/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Restablecer contraseña/ })).toBeInTheDocument();
  });
});
