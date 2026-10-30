import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MENU_FALLBACK, type MenuEnlace, type MenuRespuesta } from '../../navigation/tipos';
import { MenuEnlaces, MenuPanel } from './MenuItems';

const MENU_ADMIN: MenuRespuesta = {
  rol: 'administrador',
  inicio: '/admin',
  publico: [{ to: '/catalogo', etiqueta: 'Catálogo', icono: 'ShoppingBag' }],
  cuenta: [
    { to: '/perfil', etiqueta: 'Mi perfil', icono: 'User' },
    { to: '/notificaciones', etiqueta: 'Notificaciones', icono: 'Bell', badge: 'notificaciones' },
  ],
  panel: [
    {
      grupo: 'Gestión',
      items: [
        { to: '/admin/usuarios', etiqueta: 'Usuarios', icono: 'Users' },
        { to: '/admin/verificaciones', etiqueta: 'Verificaciones', icono: 'ShieldCheck', badge: 'verificaciones' },
      ],
    },
    {
      grupo: 'Operación',
      items: [{ to: '/admin/pedidos', etiqueta: 'Pedidos', icono: 'ClipboardList', badge: 'no_recibidos' }],
    },
  ],
  panel_titulo: 'Administración',
  badges: { verificaciones: 120, no_recibidos: 0, notificaciones: 3 },
};

function enlacesDe(menu: MenuRespuesta): MenuEnlace[] {
  return [...menu.publico, ...menu.cuenta, ...menu.panel.flatMap((grupo) => grupo.items)];
}

describe('MenuItems', () => {
  it('pinta grupos, enlaces y badges con tope 99+', () => {
    render(
      <MemoryRouter>
        <MenuPanel grupos={MENU_ADMIN.panel} badges={MENU_ADMIN.badges} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getByText('Operación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Usuarios/ })).toHaveAttribute('href', '/admin/usuarios');
    expect(screen.getByText('99+')).toHaveAttribute('aria-label', '99+ pendientes');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('marca el enlace activo y cierra el menú al navegar', async () => {
    const onNavegar = vi.fn();
    render(
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <MenuPanel grupos={MENU_ADMIN.panel} badges={MENU_ADMIN.badges} onNavegar={onNavegar} />
      </MemoryRouter>,
    );

    const usuarios = screen.getByRole('link', { name: /Usuarios/ });
    expect(usuarios).toHaveAttribute('aria-current', 'page');
    await userEvent.click(usuarios);
    expect(onNavegar).toHaveBeenCalledTimes(1);
  });

  it('muestra el menú mínimo cuando no hay respuesta del backend', () => {
    render(
      <MemoryRouter>
        <MenuEnlaces items={MENU_FALLBACK.publico} badges={MENU_FALLBACK.badges} />
        <MenuEnlaces items={MENU_FALLBACK.cuenta} badges={MENU_FALLBACK.badges} variante="cuenta" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Catálogo/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Carrito/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ingresar/ })).toBeInTheDocument();
  });

  it('cada destino de ejemplo existe como ruta en App.tsx', () => {
    const fuente = readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const rutas = new Set(
      [...fuente.matchAll(/<Route\s+(?:index\s+)?path="([^"]+)"/g)].map((coincidencia) => coincidencia[1]),
    );

    const destinos = [
      ...enlacesDe(MENU_ADMIN),
      ...enlacesDe(MENU_FALLBACK),
      { to: '/vendedor/verificacion', etiqueta: 'Verificación', icono: 'BadgeCheck' },
      { to: '/vendedor/pedidos', etiqueta: 'Pedidos', icono: 'ClipboardList' },
      { to: '/vendedor/resenas', etiqueta: 'Reseñas', icono: 'Star' },
      { to: '/admin/categorias', etiqueta: 'Categorías', icono: 'Tags' },
      { to: '/admin/resenas', etiqueta: 'Reseñas', icono: 'Star' },
      { to: '/admin/auditoria', etiqueta: 'Auditoría', icono: 'BookOpenCheck' },
    ];

    for (const destino of destinos) {
      const segmentos = destino.to.split('/').filter(Boolean);
      if (segmentos.length === 0) {
        expect(fuente).toContain('<Route index');
        continue;
      }
      const hoja = segmentos[segmentos.length - 1];
      expect(rutas.has(hoja) || rutas.has(segmentos.join('/'))).toBe(true);
      if (segmentos[0] === 'admin' || segmentos[0] === 'vendedor') {
        expect(rutas.has(segmentos[0])).toBe(true);
      }
    }
  });
});
