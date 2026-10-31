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

  it('el carrito guarda la miniatura de la foto (si no hay, la grande)', () => {
    const conFoto = (id: number, imagen: Record<string, string | null>) =>
      ({ ...producto(id), imagenes: [{ id, ...imagen }] }) as unknown as Producto;
    const { result } = montar();
    act(() => {
      result.current.agregar(conFoto(1, { url: '/media/grande-1.webp', miniatura: '/media/mini-1.webp' }), puesto(1));
    });
    act(() => {
      result.current.agregar(conFoto(2, { url: '/media/grande-2.webp', miniatura: null }), puesto(1));
    });
    act(() => {
      result.current.agregar(producto(3), puesto(1));
    });

    expect(result.current.carrito?.items.map((item) => item.imagen)).toEqual([
      expect.stringMatching(/\/media\/mini-1\.webp$/),
      expect.stringMatching(/\/media\/grande-2\.webp$/),
      null,
    ]);
  });

  describe('productos por encargo', () => {
    const encargo = (id: number, extra: Record<string, unknown> = {}) =>
      ({
        id,
        nombre: `Torta ${id}`,
        precio: '50000.00',
        stock: 0,
        unidad_medida: 'unidad',
        imagenes: [],
        modalidad: 'encargo',
        preparacion_horas: 24,
        pide_detalles: true,
        etiqueta_detalles: 'Sabor y mensaje',
        ...extra,
      }) as unknown as Producto;

    it('encargo_sin_tope_de_stock_hasta_20', () => {
      const { result } = montar();
      act(() => {
        result.current.agregar(encargo(1), puesto(1), { cantidad: 3, detalles: 'Maracuyá' });
      });
      const item = result.current.carrito!.items[0];
      expect(item).toMatchObject({
        cantidad: 3,
        stock: 20,
        modalidad: 'encargo',
        preparacionHoras: 24,
        pideDetalles: true,
        etiquetaDetalles: 'Sabor y mensaje',
        detalles: 'Maracuyá',
      });
      act(() => {
        result.current.cambiarCantidad(1, 99);
      });
      expect(result.current.carrito!.items[0].cantidad).toBe(20);
      act(() => {
        result.current.agregar(encargo(1), puesto(1), { cantidad: 5 });
      });
      expect(result.current.carrito!.items[0].cantidad).toBe(20);
      // Agregar de nuevo sin detalles no borra los que ya escribió.
      expect(result.current.carrito!.items[0].detalles).toBe('Maracuyá');
    });

    it('un producto con stock sigue topado por su stock', () => {
      const { result } = montar();
      act(() => {
        result.current.agregar(producto(1, 2), puesto(1), { cantidad: 5 });
      });
      expect(result.current.carrito!.items[0]).toMatchObject({ cantidad: 2, stock: 2 });
      expect(result.current.carrito!.items[0].modalidad).toBeUndefined();
    });

    it('carrito_viejo_sin_modalidad_sigue_funcionando', () => {
      localStorage.setItem(
        'riomarket.carrito',
        JSON.stringify({
          puestoId: 1,
          puestoNombre: 'Puesto 1',
          ofreceDomicilio: false,
          items: [{ productoId: 1, nombre: 'Arepa', precio: '3500', unidadMedida: 'unidad', cantidad: 2, stock: 5 }],
        }),
      );
      const { result } = montar();
      expect(result.current.totalItems).toBe(2);
      act(() => {
        result.current.cambiarCantidad(1, 9);
      });
      expect(result.current.carrito!.items[0].cantidad).toBe(5);
      expect(result.current.subtotal).toBe(7000 + 3500 * 3);
    });

    it('cambiar_detalles', () => {
      const { result } = montar();
      act(() => {
        result.current.agregar(encargo(1), puesto(1), { detalles: 'Fresa' });
      });
      act(() => {
        result.current.cambiarDetalles(1, 'Feliz cumpleaños Ana');
      });
      expect(result.current.carrito!.items[0].detalles).toBe('Feliz cumpleaños Ana');
      act(() => {
        result.current.cambiarDetalles(1, 'x'.repeat(400));
      });
      expect(result.current.carrito!.items[0].detalles).toHaveLength(300);
    });

    it('mezcla encargos y productos con stock en el mismo carrito', () => {
      const { result } = montar();
      act(() => {
        result.current.agregar(producto(1, 4), puesto(1), { cantidad: 2 });
      });
      act(() => {
        result.current.agregar(encargo(2), puesto(1), { detalles: 'Mora' });
      });
      expect(result.current.carrito!.items.map((i) => [i.productoId, i.modalidad ?? 'stock'])).toEqual([
        [1, 'stock'],
        [2, 'encargo'],
      ]);
    });

    it('agregarLineas lleva los detalles de un pedido anterior', () => {
      const { result } = montar();
      act(() => {
        result.current.agregarLineas(puesto(1), [{ producto: encargo(2), cantidad: 25, detalles: 'Con fresas' }]);
      });
      expect(result.current.carrito!.items[0]).toMatchObject({ cantidad: 20, detalles: 'Con fresas' });
    });
  });
});
