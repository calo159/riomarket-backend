import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Rol } from '../lib/types';
import { RutaProtegida } from './RutaProtegida';

const sesion = vi.hoisted(() => ({
  estado: 'anonimo' as 'cargando' | 'anonimo' | 'autenticado',
  usuario: null as { rol: Rol } | null,
}));

vi.mock('./SessionProvider', () => ({
  useSession: () => sesion,
}));

function LoginFalso() {
  const [params] = useSearchParams();
  return <p>login:{params.get('redirect')}</p>;
}

describe('RutaProtegida', () => {
  afterEach(() => {
    sesion.estado = 'anonimo';
    sesion.usuario = null;
  });

  it('redirige al login con el destino cuando no hay sesión', () => {
    render(
      <MemoryRouter initialEntries={['/privado?desde=test']}>
        <Routes>
          <Route path="/login" element={<LoginFalso />} />
          <Route element={<RutaProtegida />}>
            <Route path="/privado" element={<p>contenido privado</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('login:/privado?desde=test')).toBeInTheDocument();
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
  });

  it('redirige a /403 cuando el rol no tiene permiso', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'comprador' };

    render(
      <MemoryRouter initialEntries={['/vendedor']}>
        <Routes>
          <Route path="/403" element={<p>sin permiso</p>} />
          <Route element={<RutaProtegida roles={['vendedor']} />}>
            <Route path="/vendedor" element={<p>panel vendedor</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('sin permiso')).toBeInTheDocument();
    expect(screen.queryByText('panel vendedor')).not.toBeInTheDocument();
  });

  it('permite el acceso cuando el rol está autorizado', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'vendedor' };

    render(
      <MemoryRouter initialEntries={['/vendedor']}>
        <Routes>
          <Route path="/403" element={<p>sin permiso</p>} />
          <Route element={<RutaProtegida roles={['vendedor']} />}>
            <Route path="/vendedor" element={<p>panel vendedor</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('panel vendedor')).toBeInTheDocument();
    expect(screen.queryByText('sin permiso')).not.toBeInTheDocument();
  });
});
