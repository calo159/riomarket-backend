import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

const sesion = vi.hoisted(() => ({
  estado: 'anonimo',
  rol: null,
  iniciarSesion: vi.fn(),
}));

vi.mock('../../auth/SessionProvider', () => ({ useSession: () => sesion }));

function renderizar() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login: la validación del formulario (zod + react-hook-form)', () => {
  beforeEach(() => sesion.iniciarSesion.mockReset());

  it('pide el correo y la contraseña si están vacíos', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Ingresar/ }));
    expect(await screen.findByText('Escribe tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(sesion.iniciarSesion).not.toHaveBeenCalled();
  });

  it('rechaza un correo con formato inválido', async () => {
    renderizar();
    await userEvent.type(screen.getByLabelText(/^Correo/), 'no-es-correo');
    await userEvent.type(screen.getByLabelText(/^Contraseña$/), 'ClaveSegura1!');
    await userEvent.click(screen.getByRole('button', { name: /Ingresar/ }));
    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument();
    expect(sesion.iniciarSesion).not.toHaveBeenCalled();
  });

  it('con datos válidos inicia sesión (y recorta los espacios del correo)', async () => {
    sesion.iniciarSesion.mockResolvedValue({ rol: 'comprador' });
    renderizar();
    await userEvent.type(screen.getByLabelText(/^Correo/), '  ana@example.com ');
    await userEvent.type(screen.getByLabelText(/^Contraseña$/), 'ClaveSegura1!');
    await userEvent.click(screen.getByRole('button', { name: /Ingresar/ }));
    await waitFor(() =>
      expect(sesion.iniciarSesion).toHaveBeenCalledWith({ correo: 'ana@example.com', password: 'ClaveSegura1!' }),
    );
  });
});
