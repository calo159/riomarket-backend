import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsuarioCreado } from '../../api/admin';
import { NuevoUsuario } from './NuevoUsuario';

const mocks = vi.hoisted(() => ({ crearUsuario: vi.fn() }));
const toast = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../api/admin', () => mocks);
vi.mock('../../components/ui/Toast', () => ({ useToast: () => toast }));

const CREADO: UsuarioCreado = {
  id: 31,
  nombre: 'Marta Gómez',
  correo: 'marta@example.com',
  celular: '3105550101',
  rol: 'comprador',
  estado: 'activo',
  fecha_registro: '2026-11-04T10:00:00Z',
  estado_verificacion: null,
  pedidos_como_comprador: 0,
  pedidos_activos: 0,
  puestos: [],
  roles_asignados: [],
  acciones_permitidas: [],
  password_temporal: 'Kf7mQx2NpR4s',
};

function renderizar(props: Partial<{ onCerrar: () => void; onCreado: () => void }> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NuevoUsuario abierto onCerrar={props.onCerrar ?? vi.fn()} onCreado={props.onCreado ?? vi.fn()} />
    </QueryClientProvider>,
  );
}

function errorBackend(errors: Record<string, string[]>): AxiosError {
  const respuesta = { data: { errors }, status: 400, statusText: 'Bad Request', headers: {}, config: {} } as unknown as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

async function llenar(nombre = 'Marta Gómez', correo = 'marta@example.com', celular = '3105550101') {
  const dialogo = await screen.findByRole('dialog');
  await userEvent.type(within(dialogo).getByLabelText('Nombre completo'), nombre);
  await userEvent.type(within(dialogo).getByLabelText('Correo'), correo);
  await userEvent.type(within(dialogo).getByLabelText('Celular'), celular);
  return dialogo;
}

beforeEach(() => {
  mocks.crearUsuario.mockReset().mockResolvedValue(CREADO);
  toast.exito.mockReset();
  toast.info.mockReset();
});

describe('NuevoUsuario', () => {
  it('crea la cuenta con los datos escritos y el rol elegido, y avisa para refrescar la lista', async () => {
    const onCreado = vi.fn();
    renderizar({ onCreado });
    const dialogo = await llenar();
    await userEvent.selectOptions(within(dialogo).getByLabelText('Rol'), 'vendedor');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() =>
      expect(mocks.crearUsuario).toHaveBeenCalledWith({
        nombre: 'Marta Gómez',
        correo: 'marta@example.com',
        celular: '3105550101',
        rol: 'vendedor',
      }),
    );
    expect(onCreado).toHaveBeenCalled();
    expect(toast.exito).toHaveBeenCalledWith('Cuenta creada para Marta Gómez.');
  });

  it('muestra la contraseña temporal una vez, con el aviso de que no se vuelve a mostrar', async () => {
    renderizar();
    const dialogo = await llenar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Cuenta creada' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña temporal')).toHaveValue('Kf7mQx2NpR4s');
    expect(screen.getByText('marta@example.com')).toBeInTheDocument();
    expect(screen.getByText(/no se vuelve a mostrar/)).toBeInTheDocument();
  });

  it('copia la contraseña al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderizar();
    const dialogo = await llenar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar' }));

    expect(writeText).toHaveBeenCalledWith('Kf7mQx2NpR4s');
    expect(await screen.findByRole('button', { name: 'Copiada' })).toBeInTheDocument();
  });

  it('si el navegador no deja copiar, lo dice y la contraseña sigue a la vista', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) },
      configurable: true,
    });
    renderizar();
    const dialogo = await llenar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar' }));

    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(screen.getByLabelText('Contraseña temporal')).toHaveValue('Kf7mQx2NpR4s');
  });

  it('«Crear otra» vuelve al formulario vacío', async () => {
    renderizar();
    const dialogo = await llenar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Crear otra' }));

    expect(await screen.findByLabelText('Nombre completo')).toHaveValue('');
    expect(screen.queryByLabelText('Contraseña temporal')).not.toBeInTheDocument();
  });

  it('los errores del servidor salen bajo cada campo y el formulario sigue abierto', async () => {
    mocks.crearUsuario.mockRejectedValue(errorBackend({ correo: ['Ya existe una cuenta con ese correo.'] }));
    renderizar();
    const dialogo = await llenar();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));

    expect(await within(dialogo).findByText('Ya existe una cuenta con ese correo.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cuenta creada' })).not.toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nombre completo')).toHaveValue('Marta Gómez');
  });

  it('con campos vacíos no llega al servidor', async () => {
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Escribe el nombre, el correo y el celular.')).toBeInTheDocument();
    expect(mocks.crearUsuario).not.toHaveBeenCalled();
  });

  it('el aviso del rol cambia según lo que se elige', async () => {
    renderizar();
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/Compra en el catálogo/)).toBeInTheDocument();
    await userEvent.selectOptions(within(dialogo).getByLabelText('Rol'), 'administrador');
    expect(within(dialogo).getByText(/acceso total a la administración/)).toBeInTheDocument();
    await userEvent.selectOptions(within(dialogo).getByLabelText('Rol'), 'vendedor');
    expect(within(dialogo).getByText(/pendiente de verificación/)).toBeInTheDocument();
  });
});
