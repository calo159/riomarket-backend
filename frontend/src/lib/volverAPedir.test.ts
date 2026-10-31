import { describe, expect, it } from 'vitest';
import type { Producto } from './types';
import { planificarVolverAPedir, puedeVolverAPedir, resumenVolverAPedir } from './volverAPedir';

const item = (id: number, cantidad: number, nombre = `Producto ${id}`) => ({
  id_producto: id,
  nombre_producto: nombre,
  cantidad,
});
const producto = (id: number, extra: Partial<Producto> = {}) =>
  ({ id, nombre: `Producto ${id}`, estado: 'activo', stock: 10, id_puesto: 1, ...extra }) as unknown as Producto;
const mapa = (...productos: (Producto | [number, null])[]) =>
  new Map(productos.map((p) => (Array.isArray(p) ? p : [p.id, p])) as [number, Producto | null][]);

describe('planificarVolverAPedir', () => {
  it('repite la misma cantidad cuando hay stock', () => {
    const plan = planificarVolverAPedir([item(1, 2), item(2, 5)], mapa(producto(1), producto(2)));
    expect(plan.lineas.map((l) => [l.producto.id, l.cantidad])).toEqual([[1, 2], [2, 5]]);
    expect(plan.omitidas).toEqual([]);
    expect(plan.totalProductos).toBe(2);
  });

  it('limita la cantidad al stock disponible', () => {
    const plan = planificarVolverAPedir([item(1, 8)], mapa(producto(1, { stock: 3 })));
    expect(plan.lineas[0]).toMatchObject({ cantidad: 3, pedida: 8 });
  });

  it('omite los agotados, los inactivos y los que ya no existen', () => {
    const plan = planificarVolverAPedir(
      [item(1, 1), item(2, 1), item(3, 1), item(4, 1)],
      mapa(producto(1, { stock: 0 }), producto(2, { estado: 'inactivo' }), [3, null], producto(4)),
    );
    expect(plan.lineas.map((l) => l.producto.id)).toEqual([4]);
    expect(plan.omitidas.map((o) => [o.idProducto, o.motivo])).toEqual([
      [1, 'agotado'],
      [2, 'inactivo'],
      [3, 'no_disponible'],
    ]);
  });

  it('un producto bloqueado se omite como inactivo', () => {
    const plan = planificarVolverAPedir([item(1, 1)], mapa(producto(1, { estado: 'bloqueado' })));
    expect(plan.omitidas[0].motivo).toBe('inactivo');
    expect(plan.lineas).toEqual([]);
  });

  it('un producto que aparece en dos líneas se suma una sola vez', () => {
    const plan = planificarVolverAPedir([item(1, 2), item(1, 3)], mapa(producto(1)));
    expect(plan.totalProductos).toBe(1);
    expect(plan.lineas).toHaveLength(1);
    expect(plan.lineas[0].cantidad).toBe(5);
  });

  it('un pedido sin productos no agrega nada', () => {
    const plan = planificarVolverAPedir([], mapa());
    expect(plan).toEqual({ lineas: [], omitidas: [], totalProductos: 0 });
  });
});

describe('puedeVolverAPedir', () => {
  it('solo para pedidos entregados o cancelados', () => {
    expect(puedeVolverAPedir({ estado: 'entregado' })).toBe(true);
    expect(puedeVolverAPedir({ estado: 'cancelado' })).toBe(true);
    for (const estado of ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'listo_para_recoger']) {
      expect(puedeVolverAPedir({ estado })).toBe(false);
    }
  });
});

describe('resumenVolverAPedir', () => {
  it('cuenta lo agregado y nombra lo que no está', () => {
    const plan = planificarVolverAPedir(
      [item(1, 1), item(2, 1), item(3, 1), item(4, 1)],
      mapa(producto(1), producto(2), producto(3), producto(4, { stock: 0, nombre: 'Arepa de huevo' })),
    );
    expect(resumenVolverAPedir(plan)).toBe('Agregamos 3 de 4 productos; Arepa de huevo ya no está disponible.');
  });

  it('usa singular y plural', () => {
    expect(resumenVolverAPedir(planificarVolverAPedir([item(1, 1)], mapa(producto(1))))).toBe(
      'Agregamos 1 de 1 producto.',
    );
    const plan = planificarVolverAPedir(
      [item(1, 1), item(2, 1), item(3, 1)],
      mapa(producto(1), producto(2, { stock: 0, nombre: 'Queso' }), producto(3, { estado: 'inactivo', nombre: 'Suero' })),
    );
    expect(resumenVolverAPedir(plan)).toBe('Agregamos 1 de 3 productos; Queso y Suero ya no están disponibles.');
  });

  it('avisa cuando se redujo la cantidad por el stock', () => {
    const plan = planificarVolverAPedir([item(1, 6)], mapa(producto(1, { stock: 2, nombre: 'Mango' })));
    expect(resumenVolverAPedir(plan)).toBe('Agregamos 1 de 1 producto; de Mango solo quedan 2.');
  });
});
