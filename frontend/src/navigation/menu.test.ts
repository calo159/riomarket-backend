import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MENU, menuCabecera, menuParaRol } from './menu';

const etiquetas = (items: ReturnType<typeof menuParaRol>) => items.map((item) => item.etiqueta);
const ids = (items: ReturnType<typeof menuParaRol>) => items.map((item) => item.id);

describe('menuParaRol', () => {
  it('el anónimo solo ve el catálogo público', () => {
    expect(ids(menuParaRol(null, 'publico'))).toEqual(['catalogo']);
    expect(menuParaRol(null, 'cuenta')).toEqual([]);
    expect(menuParaRol(null, 'panel-vendedor')).toEqual([]);
    expect(menuParaRol(null, 'panel-admin')).toEqual([]);
  });

  it('el comprador ve su cuenta y nunca los paneles', () => {
    expect(ids(menuParaRol('comprador', 'cuenta'))).toEqual([
      'carrito',
      'mis-pedidos',
      'direcciones',
      'notificaciones',
      'perfil',
    ]);
    expect(menuParaRol('comprador', 'panel-vendedor')).toEqual([]);
    expect(menuParaRol('comprador', 'panel-admin')).toEqual([]);
  });

  it('el vendedor ve su panel y nunca el de administración', () => {
    expect(ids(menuParaRol('vendedor', 'cuenta'))).toEqual([
      'notificaciones',
      'perfil',
      'panel-vendedor',
    ]);
    expect(etiquetas(menuParaRol('vendedor', 'panel-vendedor'))).toEqual([
      'Resumen',
      'Verificación',
      'Mis puestos',
      'Productos',
      'Pedidos',
      'Cupones',
      'Reseñas',
    ]);
    expect(menuParaRol('vendedor', 'panel-admin')).toEqual([]);
  });

  it('el administrador ve su panel y nunca el de vendedor', () => {
    expect(ids(menuParaRol('administrador', 'cuenta'))).toEqual([
      'notificaciones',
      'perfil',
      'panel-admin',
    ]);
    expect(etiquetas(menuParaRol('administrador', 'panel-admin'))).toEqual([
      'Resumen',
      'Verificaciones',
      'Pedidos',
      'Puestos',
      'Pagos',
      'Cupones',
      'Auditoría',
    ]);
    expect(menuParaRol('administrador', 'panel-vendedor')).toEqual([]);
  });

  it('la cabecera añade solo el panel que corresponde al rol', () => {
    expect(ids(menuCabecera(null))).toEqual(['catalogo']);
    expect(ids(menuCabecera('comprador'))).toEqual(['catalogo']);
    expect(ids(menuCabecera('vendedor'))).toEqual(['catalogo', 'panel-vendedor']);
    expect(ids(menuCabecera('administrador'))).toEqual(['catalogo', 'panel-admin']);
  });
});

describe('registro de rutas', () => {
  it('cada destino del menú existe en App.tsx', () => {
    const raiz = process.cwd().endsWith('frontend')
      ? process.cwd()
      : resolve(process.cwd(), 'frontend');
    const app = readFileSync(resolve(raiz, 'src/App.tsx'), 'utf8');
    const rutas = new Set(
      [...app.matchAll(/path="([^"]+)"/g)].map((coincidencia) =>
        coincidencia[1].replace(/^\//, ''),
      ),
    );
    for (const item of MENU) {
      const ruta = item.to.split('?')[0].replace(/^\//, '');
      const segmento = ruta.split('/').filter(Boolean).pop() ?? ruta;
      expect(
        rutas.has(ruta) || rutas.has(segmento),
        `La ruta ${item.to} no existe en App.tsx`,
      ).toBe(true);
    }
  });

  it('no hay identificadores repetidos', () => {
    const identificadores = MENU.map((item) => item.id);
    expect(new Set(identificadores).size).toBe(identificadores.length);
  });
});
