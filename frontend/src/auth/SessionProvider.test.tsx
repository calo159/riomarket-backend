import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from './SessionProvider';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  setSessionLostHandler: vi.fn(),
}));

vi.mock('../lib/http', () => ({
  api: { get: http.get, post: http.post },
  refreshAccessToken: http.refreshAccessToken,
  setAccessToken: http.setAccessToken,
  setSessionLostHandler: http.setSessionLostHandler,
}));

const perfil = {
  id: 7,
  nombre: 'Luis',
  correo: 'luis@riomarket.test',
  celular: '3000000000',
  rol: 'vendedor',
  estado: 'activo',
  estado_verificacion: 'aprobado',
  fecha_registro: '2026-01-01T00:00:00Z',
};

function Estado() {
  const { estado, usuario, cerrarSesion } = useSession();
  return (
    <div>
      <p data-testid="estado">{estado}</p>
      <p data-testid="usuario">{usuario?.nombre ?? '-'}</p>
      <button onClick={() => void cerrarSesion()}>salir</button>
    </div>
  );
}

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <Estado />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

const borrarPista = () => {
  document.cookie = 'rm_hay_sesion=; Max-Age=0; path=/';
};

describe('SessionProvider y la pista de sesión', () => {
  beforeEach(() => {
    borrarPista();
    // El .env local puede traer VITE_API_URL de otro host: las pruebas parten del mismo origen.
    vi.stubEnv('VITE_API_URL', '');
    vi.clearAllMocks();
    http.refreshAccessToken.mockResolvedValue('access');
    http.get.mockResolvedValue({ data: perfil });
    http.post.mockResolvedValue({ data: {} });
  });
  afterEach(() => {
    borrarPista();
    vi.unstubAllEnvs();
  });

  it('sin_pista_de_sesion_no_llama_al_refresh', async () => {
    montar();

    // Anónimo desde el primer pintado: nada de «cargando» ni de viaje al servidor.
    expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
    await act(async () => {
      await Promise.resolve();
    });
    expect(http.refreshAccessToken).not.toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('con_pista_restaura_la_sesion', async () => {
    document.cookie = 'rm_hay_sesion=1; path=/';
    montar();

    expect(screen.getByTestId('estado')).toHaveTextContent('cargando');
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('autenticado'));
    expect(screen.getByTestId('usuario')).toHaveTextContent('Luis');
    expect(http.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/auth/perfil/');
  });

  it('con_pista_pero_sin_sesion_valida_queda_anonimo', async () => {
    document.cookie = 'rm_hay_sesion=1; path=/';
    http.refreshAccessToken.mockRejectedValue(new Error('401'));
    montar();

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('anonimo'));
    expect(http.get).not.toHaveBeenCalled();
  });

  it('una_cookie_de_otro_nombre_no_cuenta_como_pista', () => {
    document.cookie = 'rm_hay_sesion_falsa=1; path=/';
    document.cookie = 'otra=rm_hay_sesion=1; path=/';
    try {
      montar();

      expect(screen.getByTestId('estado')).toHaveTextContent('anonimo');
      expect(http.refreshAccessToken).not.toHaveBeenCalled();
    } finally {
      document.cookie = 'rm_hay_sesion_falsa=; Max-Age=0; path=/';
      document.cookie = 'otra=; Max-Age=0; path=/';
    }
  });

  it('al_cerrar_sesion_se_borra_la_pista', async () => {
    document.cookie = 'rm_hay_sesion=1; path=/';
    montar();
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('autenticado'));

    await act(async () => {
      screen.getByRole('button', { name: 'salir' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('anonimo'));
    expect(http.post).toHaveBeenCalledWith('/auth/logout/', {});
    expect(document.cookie.split(';').map((parte) => parte.trim().split('=')[0])).not.toContain('rm_hay_sesion');
  });

  it('con_la_api_en_otro_dominio_siempre_intenta_restaurar', async () => {
    // La cookie de la API no sería legible desde esta página: no se puede confiar en la pista.
    vi.stubEnv('VITE_API_URL', 'https://api.otro-dominio.test');
    montar();

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('autenticado'));
    expect(http.refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
