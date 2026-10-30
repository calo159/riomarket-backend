import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from '../auth/SessionProvider';
import type { Carrito, ItemCarrito, Producto, Puesto } from '../lib/types';
import { numero } from '../lib/format';
import { urlAbsoluta as absoluta } from '../lib/utils';

const CLAVE_CARRITO = 'riomarket.carrito';

function cargarCarrito(): Carrito | null {
  try {
    const crudo = localStorage.getItem(CLAVE_CARRITO);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Carrito;
    if (!datos?.puestoId || !Array.isArray(datos.items)) return null;
    return datos;
  } catch {
    return null;
  }
}

function guardarCarrito(carrito: Carrito | null): void {
  try {
    if (carrito) localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    else localStorage.removeItem(CLAVE_CARRITO);
  } catch {
    /* almacenamiento no disponible */
  }
}

interface ContextoCarrito {
  carrito: Carrito | null;
  totalItems: number;
  subtotal: number;
  agregar: (producto: Producto, puesto: Puesto) => 'agregado' | 'otro_puesto';
  reemplazarCon: (producto: Producto, puesto: Puesto, cantidad?: number) => void;
  /**
   * Agrega varios productos de un mismo puesto con su cantidad (limitada al stock). Si el carrito
   * es de otro puesto no hace nada y devuelve ``otro_puesto``, salvo con ``reemplazar``.
   */
  agregarLineas: (
    puesto: Puesto,
    lineas: { producto: Producto; cantidad: number }[],
    opciones?: { reemplazar?: boolean },
  ) => 'agregado' | 'otro_puesto';
  cambiarCantidad: (productoId: number, cantidad: number) => void;
  quitar: (productoId: number) => void;
  vaciar: () => void;
}

const Contexto = createContext<ContextoCarrito | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [carrito, setCarrito] = useState<Carrito | null>(cargarCarrito);
  const { usuario } = useSession();
  const usuarioAnterior = useRef<number | null>(usuario?.id ?? null);

  // En un equipo compartido el carrito de una persona no debe pasar a la siguiente: se vacía
  // cuando la sesión termina o cambia de cuenta. Un visitante que inicia sesión lo conserva.
  useEffect(() => {
    const actual = usuario?.id ?? null;
    if (usuarioAnterior.current !== null && usuarioAnterior.current !== actual) setCarrito(null);
    usuarioAnterior.current = actual;
  }, [usuario?.id]);

  useEffect(() => {
    guardarCarrito(carrito);
  }, [carrito]);

  useEffect(() => {
    function alCambiarStorage(evento: StorageEvent) {
      if (evento.key === CLAVE_CARRITO) setCarrito(cargarCarrito());
    }
    window.addEventListener('storage', alCambiarStorage);
    return () => window.removeEventListener('storage', alCambiarStorage);
  }, []);

  const crearItem = useCallback((producto: Producto, cantidad: number): ItemCarrito => {
    const imagen = producto.imagenes?.[0]?.url ? absoluta(producto.imagenes[0].url) : null;
    return {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      unidadMedida: producto.unidad_medida ?? 'unidad',
      cantidad,
      stock: producto.stock ?? 0,
      imagen,
    };
  }, []);

  const agregar = useCallback(
    (producto: Producto, puesto: Puesto): 'agregado' | 'otro_puesto' => {
      if (carrito && carrito.puestoId !== puesto.id) return 'otro_puesto';
      setCarrito((actual) => {
        if (!actual) {
          return {
            puestoId: puesto.id,
            puestoNombre: puesto.nombre,
            ofreceDomicilio: Boolean(puesto.ofrece_domicilio),
            items: [crearItem(producto, 1)],
          };
        }
        const existente = actual.items.find((item) => item.productoId === producto.id);
        if (existente) {
          const cantidad = Math.min(existente.cantidad + 1, producto.stock ?? existente.stock);
          return {
            ...actual,
            items: actual.items.map((item) =>
              item.productoId === producto.id ? { ...item, cantidad, stock: producto.stock ?? item.stock } : item,
            ),
          };
        }
        return { ...actual, items: [...actual.items, crearItem(producto, 1)] };
      });
      return 'agregado';
    },
    [carrito, crearItem],
  );

  const reemplazarCon = useCallback(
    (producto: Producto, puesto: Puesto, cantidad = 1) => {
      const tope = producto.stock ?? cantidad;
      setCarrito({
        puestoId: puesto.id,
        puestoNombre: puesto.nombre,
        ofreceDomicilio: Boolean(puesto.ofrece_domicilio),
        items: [crearItem(producto, Math.max(1, Math.min(cantidad, tope)))],
      });
    },
    [crearItem],
  );

  const agregarLineas = useCallback(
    (
      puesto: Puesto,
      lineas: { producto: Producto; cantidad: number }[],
      opciones: { reemplazar?: boolean } = {},
    ): 'agregado' | 'otro_puesto' => {
      if (carrito && carrito.puestoId !== puesto.id && !opciones.reemplazar) return 'otro_puesto';
      const base: Carrito | null =
        carrito && carrito.puestoId === puesto.id && !opciones.reemplazar ? carrito : null;
      const items = [...(base?.items ?? [])];
      for (const { producto, cantidad } of lineas) {
        const tope = producto.stock ?? cantidad;
        const indice = items.findIndex((item) => item.productoId === producto.id);
        if (indice >= 0) {
          const total = Math.min(items[indice].cantidad + cantidad, tope);
          items[indice] = { ...items[indice], cantidad: Math.max(1, total), stock: tope };
        } else if (tope > 0) {
          items.push(crearItem(producto, Math.max(1, Math.min(cantidad, tope))));
        }
      }
      if (items.length === 0) return 'agregado';
      setCarrito({
        puestoId: puesto.id,
        puestoNombre: puesto.nombre,
        ofreceDomicilio: Boolean(puesto.ofrece_domicilio),
        items,
      });
      return 'agregado';
    },
    [carrito, crearItem],
  );

  const cambiarCantidad = useCallback((productoId: number, cantidad: number) => {
    setCarrito((actual) => {
      if (!actual) return actual;
      if (cantidad <= 0) {
        const items = actual.items.filter((item) => item.productoId !== productoId);
        return items.length ? { ...actual, items } : null;
      }
      return {
        ...actual,
        items: actual.items.map((item) =>
          item.productoId === productoId ? { ...item, cantidad: Math.min(cantidad, item.stock) } : item,
        ),
      };
    });
  }, []);

  const quitar = useCallback((productoId: number) => {
    setCarrito((actual) => {
      if (!actual) return actual;
      const items = actual.items.filter((item) => item.productoId !== productoId);
      return items.length ? { ...actual, items } : null;
    });
  }, []);

  const vaciar = useCallback(() => setCarrito(null), []);

  const totalItems = carrito?.items.reduce((total, item) => total + item.cantidad, 0) ?? 0;
  const subtotal = carrito?.items.reduce((total, item) => total + numero(item.precio) * item.cantidad, 0) ?? 0;

  const valor = useMemo<ContextoCarrito>(
    () => ({
      carrito,
      totalItems,
      subtotal,
      agregar,
      reemplazarCon,
      agregarLineas,
      cambiarCantidad,
      quitar,
      vaciar,
    }),
    [carrito, totalItems, subtotal, agregar, reemplazarCon, agregarLineas, cambiarCantidad, quitar, vaciar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCart(): ContextoCarrito {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useCart debe usarse dentro de CartProvider.');
  return contexto;
}
