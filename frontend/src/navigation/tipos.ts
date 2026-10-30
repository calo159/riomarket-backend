export type AmbitoMenu = 'publico' | 'cuenta' | 'panel_vendedor' | 'panel_admin';

/** Un recurso con ruta que el usuario puede abrir (viene de /auth/menu/). */
export interface MenuItem {
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string;
  ambito: AmbitoMenu;
  grupo: string;
  orden: number;
}

export interface MenuRespuesta {
  rol: string;
  roles: string[];
  recursos: string[];
  items: MenuItem[];
  badges: Record<string, number>;
}

export interface GrupoMenu {
  grupo: string | null;
  items: MenuItem[];
}

/** Menú mínimo si la API falla o aún carga: solo lo público. */
export const MENU_FALLBACK: MenuRespuesta = {
  rol: 'anonimo',
  roles: [],
  recursos: ['catalogo'],
  items: [
    {
      codigo: 'catalogo',
      nombre: 'Catálogo',
      ruta: '/catalogo',
      icono: 'ShoppingBag',
      ambito: 'publico',
      grupo: '',
      orden: 0,
    },
  ],
  badges: {},
};

export function itemsDe(menu: MenuRespuesta, ...ambitos: AmbitoMenu[]): MenuItem[] {
  return menu.items.filter((item) => ambitos.includes(item.ambito));
}

/** Agrupa preservando el orden del backend; los ítems sin grupo van primero. */
export function agruparItems(items: MenuItem[]): GrupoMenu[] {
  const grupos: GrupoMenu[] = [];
  for (const item of items) {
    const nombre = item.grupo || null;
    let grupo = grupos.find((g) => g.grupo === nombre);
    if (!grupo) {
      grupo = { grupo: nombre, items: [] };
      grupos.push(grupo);
    }
    grupo.items.push(item);
  }
  return grupos.sort((a, b) => Number(a.grupo !== null) - Number(b.grupo !== null));
}

/** Primer ítem de panel (administración antes que vendedor), si el usuario tiene alguno. */
export function primerPanel(menu: MenuRespuesta): MenuItem | undefined {
  return itemsDe(menu, 'panel_admin')[0] ?? itemsDe(menu, 'panel_vendedor')[0];
}
