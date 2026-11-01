import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CambiarContrasena } from './CambiarContrasena';

const api = vi.hoisted(() => ({ cambiarContrasena: vi.fn() }));
const sesion = vi.hoisted(() => ({ cerrarSesion: vi.fn() }));
vi.mock('../api/auth', () => api);
vi.mock('../auth/SessionProvider', () => ({ useSession: () => sesion }));

function Ubicacion() {
  const ubicacion = useLocation();
  return <p data-testid="ruta">{ubicacion.pathname + ubicacion.search}</p>;
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/perfil']}>
      <Routes>
        <Route path="/perfil" element={<CambiarContrasena />} />
        <Route path="*" element={<Ubicacion />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function enviar(actual: string, nueva: string, confirmar = nueva) {
  await userEvent.type(screen.getByLabelText(/^Contraseña actual/), actual);
  await userEvent.type(screen.getByLabelText(/^Contraseña nueva/), nueva);
  await userEvent.type(screen.getByLabelText(/^Repite la contraseña nueva/), confirmar);
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
}

describe('Cambiar contraseña desde el perfil', () => {
  beforeEach(() => {
    api.cambiarContrasena.mockReset().mockResolvedValue(undefined);
    sesion.cerrarSesion.mockReset().mockResolvedValue(undefined);
  });

  it('al cambiarla cierra la sesión y vuelve al login con aviso', async () => {
    montar();
    await enviar('ClaveVieja1', 'ClaveNueva9');

    await waitFor(() => expect(api.cambiarContrasena).toHaveBeenCalledWith({ actual: 'ClaveVieja1', nueva: 'ClaveNueva9' }));
    expect(sesion.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('ruta')).toHaveTextContent('/login?restablecida=1');
  });

  it('si la contraseña actual es incorrecta, lo marca en ese campo y no cierra la sesión', async () => {
    const respuesta = { status: 400, data: { errors: { actual: ['La contraseña actual es incorrecta.'] } } } as AxiosResponse;
    api.cambiarContrasena.mockRejectedValue(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, respuesta));
    montar();
    await enviar('Equivocada1', 'ClaveNueva9');

    expect(await screen.findByText('La contraseña actual es incorrecta.')).toBeInTheDocument();
    expect(sesion.cerrarSesion).not.toHaveBeenCalled();
  });

  it('muestra bajo el campo la regla que rechaza el servidor (contraseña común)', async () => {
    const respuesta = { status: 400, data: { errors: { non_field_errors: ['Esta contraseña es demasiado común.'] } } } as AxiosResponse;
    api.cambiarContrasena.mockRejectedValue(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, respuesta));
    montar();
    await enviar('ClaveVieja1', 'Password123');

    expect(await screen.findByText('Esta contraseña es demasiado común.')).toBeInTheDocument();
    expect(sesion.cerrarSesion).not.toHaveBeenCalled();
  });

  it('no llama al servidor si la nueva no cumple las reglas o no coincide', async () => {
    montar();
    await enviar('ClaveVieja1', 'sinnumeros', 'otra');

    expect(await screen.findByText('Incluye al menos un número.')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(api.cambiarContrasena).not.toHaveBeenCalled();
  });
});
