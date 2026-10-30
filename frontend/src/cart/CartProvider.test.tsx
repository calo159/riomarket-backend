import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Producto, Puesto } from '../lib/types';
import { CartProvider, useCart } from './CartProvider';

const sesion = vi.hoisted(() => ({ usuario: null as { id: number } | null }));
vi.mock('../auth/SessionProvider', () => ({ useSession: () => sesion }));

const puesto = (id: number) => ({ id, nombre: `Puesto ${id}`, ofrece_domicilio: false }) as unknown as Puesto;
const producto = (id: number, stock = 10) =>
  ({ id, nombre: `Producto ${id}`, precio: '1500.00', stock, unidad_medida: 'unidad', imagenes: [] }) as unknown as Producto;

function montar() {
  return renderHook(() => useCart(), {
    wrapper: ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>,
  });
}

describe('CartProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sesion.usuario = null;
  });

  it('al reemplazar el carrito de otro puesto conserva la cantidad elegida', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(producto(1), puesto(1));
    });
    act(() => {
      result.current.reemplazarCon(producto(2), puesto(2), 3);
    });
    expect(result.current.carrito?.puestoId).toBe(2);
    expect(result.current.totalItems).toBe(3);
  });

  it('la cantidad al reemplazar no supera el stock', () => {
    const { result } = montar();
    act(() => {
      result.current.reemplazarCon(producto(2, 2), puesto(2), 5);
    });
    expect(result.current.totalItems).toBe(2);
  });

  it('el carrito se vacía cuando la sesión termina', () => {
    sesion.usuario = { id: 7 };
    const { result, rerender } = montar();
    act(() => {
      result.current.agregar(producto(1), puesto(1));
    });
    expect(result.current.totalItems).toBe(1);

    sesion.usuario = null;
    rerender();
    expect(result.current.carrito).toBeNull();
    expect(localStorage.getItem('riomarket.carrito')).toBeNull();
  });

  it('un visitante que inicia sesión conserva el carrito que armó', () => {
    const { result, rerender } = montar();
    act(() => {
      result.current.agregar(producto(1), puesto(1));
    });
    sesion.usuario = { id: 7 };
    rerender();
    expect(result.current.totalItems).toBe(1);
  });

  it('agregarLineas suma varias líneas del mismo puesto con su cantidad y el tope de stock', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(producto(1, 10), puesto(1));
    });
    let respuesta = '';
    act(() => {
      respuesta = result.current.agregarLineas(puesto(1), [
        { producto: producto(1, 10), cantidad: 3 },
        { producto: producto(2, 4), cantidad: 9 },
      ]);
    });
    expect(respuesta).toBe('agregado');
    expect(result.current.carrito?.items.map((i) => [i.productoId, i.cantidad])).toEqual([
      [1, 4],
      [2, 4],
    ]);
  });

  it('agregarLineas no pisa en silencio el carrito de otro puesto', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(producto(1), puesto(1));
    });
    let respuesta = '';
    act(() => {
      respuesta = result.current.agregarLineas(puesto(2), [{ producto: producto(5), cantidad: 2 }]);
    });
    expect(respuesta).toBe('otro_puesto');
    expect(result.current.carrito?.puestoId).toBe(1);
    expect(result.current.totalItems).toBe(1);
  });

  it('agregarLineas con reemplazar cambia el carrito al nuevo puesto', () => {
    const { result } = montar();
    act(() => {
      result.current.agregar(producto(1), puesto(1));
    });
    act(() => {
      result.current.agregarLineas(puesto(2), [{ producto: producto(5), cantidad: 2 }], { reemplazar: true });
    });
    expect(result.current.carrito?.puestoId).toBe(2);
    expect(result.current.totalItems).toBe(2);
  });
});
