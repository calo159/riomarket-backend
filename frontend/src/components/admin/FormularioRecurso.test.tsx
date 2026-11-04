import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecursoAdmin } from '../../api/admin';
import { NOMBRES_ICONOS } from '../../navigation/iconos';
import { FormularioRecurso } from './FormularioRecurso';

const mocks = vi.hoisted(() => ({ actualizarRecurso: vi.fn(), crearRecurso: vi.fn() }));

vi.mock('../../api/admin', async (original) => ({
  ...(await original<typeof import('../../api/admin')>()),
  actualizarRecurso: mocks.actualizarRecurso,
  crearRecurso: mocks.crearRecurso,
}));
vi.mock('../ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const SISTEMA: RecursoAdmin = {
  id: 3,
  codigo: 'admin.pagos',
  nombre: 'Pagos',
  descripcion: 'Pagos del mercado',
  ambito: 'panel_admin',
  ruta: '/admin/pagos',
  icono: 'CreditCard',
  grupo: 'Gestión',
  orden: 5,
  es_publico: false,
  es_sistema: true,
  activo: true,
  total_roles: 1,
};

function renderizar(recurso: RecursoAdmin | 'nuevo', onGuardado = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <FormularioRecurso recurso={recurso} onCerrar={vi.fn()} onGuardado={onGuardado} />
    </QueryClientProvider>,
  );
  return onGuardado;
}

beforeEach(() => {
  mocks.actualizarRecurso.mockReset().mockResolvedValue({});
  mocks.crearRecurso.mockReset().mockResolvedValue({});
});

describe('FormularioRecurso (completo)', () => {
  it('en un recurso de sistema bloquea código, ámbito, ruta y los interruptores, y solo envía lo editable', async () => {
    const guardado = renderizar(SISTEMA);

    expect(screen.getByLabelText('Código')).toBeDisabled();
    expect(screen.getByLabelText('Ámbito')).toBeDisabled();
    expect(screen.getByLabelText('Ruta')).toBeDisabled();
    expect(screen.getByLabelText('Activo')).toBeDisabled();
    expect(screen.getByLabelText('Visible sin sesión')).toBeDisabled();
    expect(screen.getByText(/Es un recurso de sistema/)).toBeInTheDocument();

    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Cobros');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(mocks.actualizarRecurso).toHaveBeenCalledWith(3, {
        nombre: 'Cobros',
        descripcion: 'Pagos del mercado',
        icono: 'CreditCard',
        grupo: 'Gestión',
        orden: 5,
      }),
    );
    await waitFor(() => expect(guardado).toHaveBeenCalled());
  });

  it('crear exige código y nombre, y una ruta que empiece con «/»', async () => {
    renderizar('nuevo');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El código y el nombre son obligatorios.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Código'), 'admin.reportes');
    await userEvent.type(screen.getByLabelText('Nombre'), 'Reportes');
    await userEvent.type(screen.getByLabelText('Ruta'), 'admin/reportes');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La ruta debe estar vacía o empezar con «/».')).toBeInTheDocument();
    expect(mocks.crearRecurso).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Ruta'));
    await userEvent.type(screen.getByLabelText('Ruta'), '/admin/reportes');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(mocks.crearRecurso).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'admin.reportes', ruta: '/admin/reportes' })));
  });
});

describe('Selector de icono', () => {
  it('ofrece solo los iconos que el menú sabe dibujar, más «sin icono»', () => {
    renderizar(SISTEMA);
    const opciones = Array.from((screen.getByLabelText('Icono') as HTMLSelectElement).options).map((o) => o.value);
    expect(opciones).toEqual(['', ...NOMBRES_ICONOS]);
    expect(NOMBRES_ICONOS).toContain('Users');
    expect(screen.getByLabelText('Icono')).toHaveValue('CreditCard');
  });

  it('un icono viejo fuera de la lista no se pierde en silencio', () => {
    renderizar({ ...SISTEMA, icono: 'Rocket' });
    expect(screen.getByLabelText('Icono')).toHaveValue('Rocket');
    expect(screen.getByRole('option', { name: 'Rocket (no reconocido)' })).toBeInTheDocument();
  });
});
