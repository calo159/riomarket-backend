import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Rol } from '../lib/types';
import { RutaProtegida } from './RutaProtegida';

const sesion = vi.hoisted(() => ({
  estado: 'anonimo' as 'cargando' | 'anonimo' | 'autenticado',
  usuario: null as { rol: Rol } | null,
}));
const acceso = vi.hoisted(() => ({
  recursos: [] as string[],
  cargando: false,
}));

vi.mock('./SessionProvider', () => ({
  useSession: () => sesion,
}));

vi.mock('../navigation/useMenu', () => ({
  useAcceso: () => ({
    cargando: acceso.cargando,
    recursos: new Set(acceso.recursos),
    tiene: (codigo: string) => acceso.recursos.includes(codigo),
  }),
}));

function LoginFalso() {
  const [params] = useSearchParams();
  return <p>login:{params.get('redirect')}</p>;
}

function montar(ruta: string, propiedades: { roles?: Rol[]; recurso?: string }) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<LoginFalso />} />
        <Route path="/403" element={<p>sin permiso</p>} />
        <Route element={<RutaProtegida {...propiedades} />}>
          <Route path="/privado" element={<p>contenido privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RutaProtegida', () => {
  afterEach(() => {
    sesion.estado = 'anonimo';
    sesion.usuario = null;
    acceso.recursos = [];
    acceso.cargando = false;
  });

  it('redirige al login con el destino cuando no hay sesión', () => {
    montar('/privado?desde=test', {});
    expect(screen.getByText('login:/privado?desde=test')).toBeInTheDocument();
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
  });

  it('redirige a /403 cuando el rol no tiene permiso', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'comprador' };
    montar('/privado', { roles: ['vendedor'] });
    expect(screen.getByText('sin permiso')).toBeInTheDocument();
  });

  it('permite el acceso cuando el rol está autorizado', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'vendedor' };
    montar('/privado', { roles: ['vendedor'] });
    expect(screen.getByText('contenido privado')).toBeInTheDocument();
  });

  it('con recurso: permite si el menú lo incluye', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'comprador' };
    acceso.recursos = ['admin.puestos'];
    montar('/privado', { recurso: 'admin.puestos' });
    expect(screen.getByText('contenido privado')).toBeInTheDocument();
  });

  it('con recurso: redirige a /403 si no lo tiene, aunque el rol base sea administrador', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'administrador' };
    acceso.recursos = ['admin.resumen'];
    montar('/privado', { recurso: 'admin.roles' });
    expect(screen.getByText('sin permiso')).toBeInTheDocument();
  });

  it('con recurso: espera a que cargue el menú antes de decidir', () => {
    sesion.estado = 'autenticado';
    sesion.usuario = { rol: 'administrador' };
    acceso.cargando = true;
    montar('/privado', { recurso: 'admin.roles' });
    expect(screen.queryByText('sin permiso')).not.toBeInTheDocument();
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
  });
});
