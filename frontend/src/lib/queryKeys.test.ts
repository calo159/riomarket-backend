import { describe, expect, it } from 'vitest';
import { claves, idClave } from './queryKeys';

describe('claves de consulta', () => {
  it('normaliza los ids para que string y número den la misma clave', () => {
    expect(claves.puesto('3')).toEqual(claves.puesto(3));
    expect(claves.pedido('12')).toEqual(claves.pedido(12));
    expect(claves.resenas.deUnPuesto('7')).toEqual(claves.resenas.deUnPuesto(7));
    expect(claves.productos.deUnPuesto('2', '', 1)).toEqual(claves.productos.deUnPuesto(2, '', 1));
  });

  it('idClave devuelve null para ids vacíos o no numéricos', () => {
    expect(idClave(undefined)).toBeNull();
    expect(idClave(null)).toBeNull();
    expect(idClave('')).toBeNull();
    expect(idClave('abc')).toBeNull();
    expect(idClave('5')).toBe(5);
  });

  it('cada consulta de una familia empieza por el prefijo que se invalida', () => {
    const empiezaPor = (clave: readonly unknown[], prefijo: readonly unknown[]) =>
      prefijo.every((parte, i) => clave[i] === parte);
    expect(empiezaPor(claves.pedidos.admin(1, '', false), claves.pedidos.todos)).toBe(true);
    expect(empiezaPor(claves.pedidos.vendedor(4, 1, ''), claves.pedidos.todos)).toBe(true);
    expect(empiezaPor(claves.pagos.deUnPedido('9'), claves.pagos.todos)).toBe(true);
    expect(empiezaPor(claves.pagos.admin('', false), claves.pagos.todos)).toBe(true);
    expect(empiezaPor(claves.usuarios.lista(1, '', '', '', ''), claves.usuarios.todos)).toBe(true);
    expect(empiezaPor(claves.notificaciones.lista(1, false), claves.notificaciones.todos)).toBe(true);
    expect(empiezaPor(claves.productos.vendedorTotal, claves.productos.todos)).toBe(true);
    expect(empiezaPor(claves.puestos.vendedor(1), claves.puestos.todos)).toBe(true);
    expect(empiezaPor(claves.resenas.vendedor(1), claves.resenas.todos)).toBe(true);
    expect(empiezaPor(claves.cupones.admin, claves.cupones.todos)).toBe(true);
  });
});
