export interface MenuEnlace {
  to: string;
  etiqueta: string;
  icono: string;
  fin?: boolean;
  badge?: string;
}

export interface MenuGrupo {
  grupo: string | null;
  items: MenuEnlace[];
}

export interface MenuRespuesta {
  rol: string;
  inicio: string;
  publico: MenuEnlace[];
  cuenta: MenuEnlace[];
  panel: MenuGrupo[];
  panel_titulo: string | null;
  badges: Record<string, number>;
}

export const MENU_FALLBACK: MenuRespuesta = {
  rol: 'anonimo',
  inicio: '/',
  publico: [
    { to: '/catalogo', etiqueta: 'Catálogo', icono: 'ShoppingBag' },
    { to: '/carrito', etiqueta: 'Carrito', icono: 'ShoppingCart' },
  ],
  cuenta: [{ to: '/login', etiqueta: 'Ingresar', icono: 'LogIn' }],
  panel: [],
  panel_titulo: null,
  badges: {},
};
