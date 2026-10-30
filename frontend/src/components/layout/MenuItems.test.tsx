import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { itemsDe, MENU_FALLBACK, type MenuItem, type MenuRespuesta } from '../../navigation/tipos';
import { MenuItems, MenuPanel } from './MenuItems';

function item(codigo: string, nombre: string, ruta: string, ambito: MenuItem['ambito'], grupo = '', orden = 1): MenuItem {
  return { codigo, nombre, ruta, icono: 'Circle', ambito, grupo, orden };
}

const CATALOGO = item('catalogo', 'Catálogo', '/catalogo', 'publico');
const PERFIL = item('perfil', 'Mi perfil', '/perfil', 'cuenta');
const NOTIFICACIONES = item('notificaciones', 'Notificaciones', '/notificaciones', 'cuenta', '', 2);

const MENU_COMPRADOR: MenuRespuesta = {
  rol: 'comprador',
  roles: ['comprador'],
  recursos: ['catalogo', 'mis_pedidos', 'perfil'],
  items: [CATALOGO, item('mis_pedidos', 'Mis pedidos', '/mis-pedidos', 'cuenta'), PERFIL],
  badges: { mis_pedidos: 2 },
};

const MENU_ADMIN: MenuRespuesta = {
  rol: 'administrador',
  roles: ['administrador'],
  recursos: ['admin.resumen', 'admin.usuarios', 'admin.verificaciones', 'admin.pedidos'],
  items: [
    CATALOGO,
    PERFIL,
    NOTIFICACIONES,
    item('admin.resumen', 'Resumen', '/admin', 'panel_admin'),
    item('admin.usuarios', 'Usuarios', '/admin/usuarios', 'panel_admin', 'Accesos'),
    item('admin.verificaciones', 'Verificaciones', '/admin/verificaciones', 'panel_admin', 'Gestión'),
    item('admin.pedidos', 'Pedidos', '/admin/pedidos', 'panel_admin', 'Operación'),
  ],
  badges: { 'admin.verificaciones': 120, 'admin.pedidos': 0, notificaciones: 3 },
};

describe('MenuItems', () => {
  it('renderiza distinto según la respuesta de cada rol', () => {
    const { rerender } = render(
      <MemoryRouter>
        <MenuItems items={itemsDe(MENU_COMPRADOR, 'cuenta')} badges={MENU_COMPRADOR.badges} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Mis pedidos/ })).toHaveAttribute('href', '/mis-pedidos');
    expect(screen.queryByRole('link', { name: /Usuarios/ })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <MenuPanel items={itemsDe(MENU_ADMIN, 'panel_admin')} badges={MENU_ADMIN.badges} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Usuarios/ })).toHaveAttribute('href', '/admin/usuarios');
    expect(screen.queryByRole('link', { name: /Mis pedidos/ })).not.toBeInTheDocument();
  });

  it('agrupa el panel, muestra el badge con tope 99+ y oculta los ceros', () => {
    render(
      <MemoryRouter>
        <MenuPanel items={itemsDe(MENU_ADMIN, 'panel_admin')} badges={MENU_ADMIN.badges} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Accesos')).toBeInTheDocument();
    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getByText('99+')).toHaveAttribute('aria-label', '99+ pendientes');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('sin dato de badge no pinta nada', () => {
    render(
      <MemoryRouter>
        <MenuItems items={itemsDe(MENU_COMPRADOR, 'cuenta')} badges={{}} />
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText(/pendientes/)).not.toBeInTheDocument();
  });

  it('marca el enlace activo, solo marca la raíz del panel en su ruta exacta y cierra al navegar', async () => {
    const onNavegar = vi.fn();
    render(
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <MenuPanel items={itemsDe(MENU_ADMIN, 'panel_admin')} badges={{}} onNavegar={onNavegar} />
      </MemoryRouter>,
    );
    const usuarios = screen.getByRole('link', { name: /Usuarios/ });
    expect(usuarios).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Resumen/ })).not.toHaveAttribute('aria-current');
    await userEvent.click(usuarios);
    expect(onNavegar).toHaveBeenCalledTimes(1);
  });

  it('muestra solo el catálogo cuando el backend no responde', () => {
    render(
      <MemoryRouter>
        <MenuItems items={itemsDe(MENU_FALLBACK, 'publico')} badges={MENU_FALLBACK.badges} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Catálogo/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('cada ruta del catálogo de recursos existe en App.tsx', () => {
    const fuente = readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const rutas = new Set(
      [...fuente.matchAll(/<Route\s+(?:index\s+)?path="([^"]+)"/g)].map((coincidencia) => coincidencia[1]),
    );
    const destinos = [
      ...MENU_COMPRADOR.items,
      ...MENU_ADMIN.items,
      item('admin.roles', 'Roles', '/admin/roles', 'panel_admin'),
      item('admin.recursos', 'Recursos', '/admin/recursos', 'panel_admin'),
      item('vendedor.resumen', 'Resumen', '/vendedor', 'panel_vendedor'),
      item('vendedor.pedidos', 'Pedidos', '/vendedor/pedidos', 'panel_vendedor'),
      item('admin.auditoria', 'Auditoría', '/admin/auditoria', 'panel_admin'),
      item('direcciones', 'Direcciones', '/direcciones', 'cuenta'),
    ];

    for (const destino of destinos) {
      const segmentos = destino.ruta.split('/').filter(Boolean);
      if (segmentos.length === 1 && (segmentos[0] === 'admin' || segmentos[0] === 'vendedor')) {
        expect(rutas.has(segmentos[0])).toBe(true);
        continue;
      }
      expect(rutas.has(segmentos[segmentos.length - 1])).toBe(true);
    }
    // Cada ruta de panel se protege por su recurso, no por el rol.
    for (const codigo of ['admin.roles', 'admin.recursos', 'vendedor.pedidos', 'admin.usuarios']) {
      expect(fuente).toContain(`recurso="${codigo}"`);
    }
  });
});
