import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BotonExportar } from './BotonExportar';

const mocks = vi.hoisted(() => ({ descargarArchivo: vi.fn() }));
const toast = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../lib/descargas', () => mocks);
vi.mock('../ui/Toast', () => ({ useToast: () => toast }));

beforeEach(() => {
  mocks.descargarArchivo.mockReset();
  Object.values(toast).forEach((mock) => mock.mockReset());
});

describe('BotonExportar', () => {
  it('descarga con los filtros recibidos y dice cuántas filas salieron', async () => {
    mocks.descargarArchivo.mockResolvedValue({ nombre: 'usuarios.csv', filas: 7, truncado: false });
    render(<BotonExportar ruta="/admin/usuarios/exportar/" params={{ rol: 'vendedor' }} nombre="usuarios.csv" />);

    await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    expect(mocks.descargarArchivo).toHaveBeenCalledWith('/admin/usuarios/exportar/', { rol: 'vendedor' }, 'usuarios.csv');
    await waitFor(() => expect(toast.exito).toHaveBeenCalledWith('Descargamos 7 filas.'));
  });

  it('si el servidor cortó en su tope, lo avisa y sugiere afinar los filtros', async () => {
    mocks.descargarArchivo.mockResolvedValue({ nombre: 'x.csv', filas: 20000, truncado: true });
    render(<BotonExportar ruta="/x/" nombre="x.csv" />);

    await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Afina los filtros')));
    expect(toast.exito).not.toHaveBeenCalled();
  });

  it('si falla, avisa con error y el botón vuelve a quedar disponible', async () => {
    mocks.descargarArchivo.mockRejectedValue(new Error('sin red'));
    render(<BotonExportar ruta="/x/" nombre="x.csv" />);

    await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeEnabled();
  });

  it('mientras descarga no deja pulsar de nuevo', async () => {
    let terminar: (valor: unknown) => void = () => undefined;
    mocks.descargarArchivo.mockReturnValue(new Promise((resolver) => (terminar = resolver)));
    render(<BotonExportar ruta="/x/" nombre="x.csv" />);

    await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    expect(screen.getByRole('button', { name: /Exportando/ })).toBeDisabled();
    terminar({ nombre: 'x.csv', filas: 1, truncado: false });
    await waitFor(() => expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeEnabled());
  });
});
