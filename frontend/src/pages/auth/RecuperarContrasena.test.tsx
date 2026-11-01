import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OlvideContrasena } from './OlvideContrasena';
import { RestablecerContrasena } from './RestablecerContrasena';

const api = vi.hoisted(() => ({ solicitarRecuperacion: vi.fn(), restablecerContrasena: vi.fn() }));
vi.mock('../../api/auth', () => api);

function Ubicacion() {
  const ubicacion = useLocation();
  return <p data-testid="ruta">{ubicacion.pathname + ubicacion.search}</p>;
}

function montar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route path="*" element={<Ubicacion />} />
      </Routes>
    </MemoryRouter>,
  );
}

function errorDeApi(status: number, errors: Record<string, string[]>) {
  const respuesta = { status, data: { success: false, status_code: status, errors } } as AxiosResponse;
  return new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

describe('Olvidé mi contraseña', () => {
  beforeEach(() => {
    api.solicitarRecuperacion.mockReset().mockResolvedValue(undefined);
  });

  it('valida el correo antes de pedir nada', async () => {
    montar('/olvide-contrasena');
    await userEvent.type(screen.getByLabelText(/^Correo/), 'no-es-correo');
    await userEvent.click(screen.getByRole('button', { name: /Enviarme el enlace/ }));
    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument();
    expect(api.solicitarRecuperacion).not.toHaveBeenCalled();
  });

  it('confirma el envío sin afirmar que la cuenta existe', async () => {
    montar('/olvide-contrasena');
    await userEvent.type(screen.getByLabelText(/^Correo/), '  ana@example.com ');
    await userEvent.click(screen.getByRole('button', { name: /Enviarme el enlace/ }));

    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument();
    expect(api.solicitarRecuperacion).toHaveBeenCalledWith('ana@example.com');
    expect(screen.getByRole('status')).toHaveTextContent(/Si ana@example.com tiene una cuenta/);
  });

  it('muestra el aviso del servidor si falla (por ejemplo, demasiadas solicitudes)', async () => {
    api.solicitarRecuperacion.mockRejectedValue(errorDeApi(429, { detail: ['Espera 30 segundos e inténtalo de nuevo.'] }));
    montar('/olvide-contrasena');
    await userEvent.type(screen.getByLabelText(/^Correo/), 'ana@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Enviarme el enlace/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Espera 30 segundos/);
  });
});

describe('Restablecer contraseña', () => {
  beforeEach(() => {
    api.restablecerContrasena.mockReset().mockResolvedValue(undefined);
  });

  async function escribir(nueva: string, confirmar: string) {
    await userEvent.type(screen.getByLabelText(/^Contraseña nueva/), nueva);
    await userEvent.type(screen.getByLabelText(/^Repite la contraseña/), confirmar);
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/ }));
  }

  it('con el enlace del correo no pide el código y vuelve al login con aviso', async () => {
    montar('/restablecer-contrasena?token=ABC123');
    expect(screen.queryByLabelText(/Código del correo/)).not.toBeInTheDocument();

    await escribir('ClaveNueva9', 'ClaveNueva9');

    await waitFor(() => expect(api.restablecerContrasena).toHaveBeenCalledWith({ token: 'ABC123', nueva: 'ClaveNueva9' }));
    expect(await screen.findByTestId('ruta')).toHaveTextContent('/login?restablecida=1');
  });

  it('sin enlace pide pegar el código', async () => {
    montar('/restablecer-contrasena');
    await userEvent.type(screen.getByLabelText(/Código del correo/), ' XYZ789 ');
    await escribir('ClaveNueva9', 'ClaveNueva9');
    await waitFor(() => expect(api.restablecerContrasena).toHaveBeenCalledWith({ token: 'XYZ789', nueva: 'ClaveNueva9' }));
  });

  it('exige el código si no hay enlace', async () => {
    montar('/restablecer-contrasena');
    await escribir('ClaveNueva9', 'ClaveNueva9');
    expect(await screen.findByText('Pega el código que te enviamos por correo.')).toBeInTheDocument();
    expect(api.restablecerContrasena).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas débiles o que no coinciden sin llamar al servidor', async () => {
    montar('/restablecer-contrasena?token=ABC123');
    await escribir('corta', 'distinta');
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(api.restablecerContrasena).not.toHaveBeenCalled();
  });

  it('si el enlace venció, lo dice y ofrece pedir otro', async () => {
    api.restablecerContrasena.mockRejectedValue(errorDeApi(400, { token: ['Token inválido o expirado.'] }));
    montar('/restablecer-contrasena?token=VIEJO');
    await escribir('ClaveNueva9', 'ClaveNueva9');

    expect(await screen.findByRole('alert')).toHaveTextContent(/venció o ya se usó/);
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/olvide-contrasena');
  });

  it('muestra bajo el campo lo que rechaza el servidor de la contraseña nueva, sin ofrecer otro enlace', async () => {
    api.restablecerContrasena.mockRejectedValue(errorDeApi(400, { non_field_errors: ['Esta contraseña es demasiado común.'] }));
    montar('/restablecer-contrasena?token=ABC123');
    await escribir('Password123', 'Password123');
    expect(await screen.findByText('Esta contraseña es demasiado común.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pedir un enlace nuevo' })).not.toBeInTheDocument();
  });
});
