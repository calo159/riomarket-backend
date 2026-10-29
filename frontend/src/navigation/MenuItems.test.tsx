import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MenuItems } from './MenuItems';
import { menuParaRol } from './menu';
import type { BadgesMenu } from './useMenuBadges';

function renderMenu(
  items: ReturnType<typeof menuParaRol>,
  badges: BadgesMenu = {},
  ruta = '/',
) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <MenuItems items={items} variante="movil" badges={badges} />
    </MemoryRouter>,
  );
}

describe('MenuItems', () => {
  it('pinta los ítems que corresponden al rol', () => {
    renderMenu(menuParaRol('comprador', 'cuenta'));
    expect(screen.getByRole('link', { name: /Mis pedidos/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Auditoría/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Verificación/ })).not.toBeInTheDocument();
  });

  it('muestra el badge cuando hay pendientes', () => {
    renderMenu(menuParaRol('comprador', 'cuenta'), { 'comprador-pedidos': 3 }, '/mis-pedidos');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mis pedidos/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('oculta el badge si no hay pendientes o la consulta aún no responde', () => {
    renderMenu(menuParaRol('comprador', 'cuenta'), {});
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();

    renderMenu(menuParaRol('comprador', 'cuenta'), { 'comprador-pedidos': 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('limita el badge a 99+', () => {
    renderMenu(menuParaRol('vendedor', 'panel-vendedor'), { 'vendedor-pedidos': 120 });
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
