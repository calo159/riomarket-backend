import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Registro } from './Registro';

const sesion = vi.hoisted(() => ({ estado: 'anonimo', iniciarSesion: vi.fn() }));
const registrar = vi.hoisted(() => vi.fn());

vi.mock('../../auth/SessionProvider', () => ({ useSession: () => sesion }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../../api/auth', () => ({ registrarUsuario: registrar }));

function renderizar() {
  return render(
    <MemoryRouter>
      <Registro />
    </MemoryRouter>,
  );
}

describe('Registro: mensajes de la validación del formulario', () => {
  it('muestra los mensajes de cada campo si se envía vacío', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }));
    expect(await screen.findByText('Escribe tu nombre completo.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Escribe un celular válido.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Repite tu contraseña.')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar las condiciones para continuar.')).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
  });

  it('valida el formato del correo, del celular y la contraseña', async () => {
    renderizar();
    await userEvent.type(screen.getByLabelText(/^Correo/), 'no-es-correo');
    await userEvent.type(screen.getByLabelText(/^Celular/), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/^Contraseña/), 'sololetras');
    await userEvent.type(screen.getByLabelText(/^Repite la contraseña/), 'otra');
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }));
    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument();
    expect(screen.getByText('Usa solo números, espacios o el signo +.')).toBeInTheDocument();
    expect(screen.getByText('Incluye al menos un número.')).toBeInTheDocument();
  });

  it('avisa si las contraseñas no coinciden', async () => {
    renderizar();
    await userEvent.type(screen.getByLabelText(/^Nombre completo/), 'Ana Perez');
    await userEvent.type(screen.getByLabelText(/^Correo/), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(/^Celular/), '3001234567');
    await userEvent.type(screen.getByLabelText(/^Contraseña/), 'Clave1234');
    await userEvent.type(screen.getByLabelText(/^Repite la contraseña/), 'Clave12345');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }));
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
  });
});
