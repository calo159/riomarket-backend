import type { ItemPedido, Producto } from './types';
import { MAX_CANTIDAD_ENCARGO, esEncargo } from './encargos';

const ESTADOS_REPETIBLES = ['entregado', 'cancelado'];

/** Solo se repite un pedido que ya terminó: entregado o cancelado. */
export function puedeVolverAPedir(pedido: { estado: string }): boolean {
  return ESTADOS_REPETIBLES.includes(pedido.estado);
}

export type MotivoOmision = 'inactivo' | 'agotado' | 'no_disponible';

export interface LineaAgregable {
  producto: Producto;
  cantidad: number;
  /** Cantidad del pedido original, cuando el stock actual no alcanza para repetirla. */
  pedida: number;
  /** Detalles que el comprador escribió la vez anterior (solo encargos); la fecha se vuelve a elegir. */
  detalles?: string;
}

export interface LineaOmitida {
  idProducto: number;
  nombre: string;
  motivo: MotivoOmision;
}

export interface PlanVolverAPedir {
  lineas: LineaAgregable[];
  omitidas: LineaOmitida[];
  totalProductos: number;
}

/**
 * Decide qué se puede repetir de un pedido anterior. Función pura: no toca el carrito ni la red.
 *
 * ``actuales`` trae el producto tal como está hoy (``undefined``/``null`` si ya no existe o no se
 * pudo consultar). Se omiten los inactivos, los agotados y los que ya no están; el resto se
 * agrega con la misma cantidad, limitada al stock disponible. Un producto del pedido que se repite
 * en varias líneas se suma una sola vez.
 */
export function planificarVolverAPedir(
  items: Pick<ItemPedido, 'id_producto' | 'nombre_producto' | 'cantidad' | 'detalles'>[],
  actuales: ReadonlyMap<number, Producto | null | undefined>,
): PlanVolverAPedir {
  const pedidas = new Map<number, { nombre: string; cantidad: number; detalles: string }>();
  for (const item of items) {
    const previa = pedidas.get(item.id_producto);
    if (previa) {
      previa.cantidad += item.cantidad;
      previa.detalles ||= item.detalles ?? '';
    } else {
      pedidas.set(item.id_producto, {
        nombre: item.nombre_producto,
        cantidad: item.cantidad,
        detalles: item.detalles ?? '',
      });
    }
  }

  const lineas: LineaAgregable[] = [];
  const omitidas: LineaOmitida[] = [];
  for (const [idProducto, { nombre, cantidad, detalles }] of pedidas) {
    const producto = actuales.get(idProducto);
    if (!producto) {
      omitidas.push({ idProducto, nombre, motivo: 'no_disponible' });
    } else if (producto.estado !== 'activo') {
      omitidas.push({ idProducto, nombre: producto.nombre, motivo: 'inactivo' });
    } else if (esEncargo(producto)) {
      // Un encargo no tiene stock: se repite hasta el máximo de 20 y con sus detalles de antes.
      lineas.push({
        producto,
        cantidad: Math.max(1, Math.min(cantidad, MAX_CANTIDAD_ENCARGO)),
        pedida: cantidad,
        detalles,
      });
    } else if ((producto.stock ?? 0) <= 0) {
      omitidas.push({ idProducto, nombre: producto.nombre, motivo: 'agotado' });
    } else {
      lineas.push({
        producto,
        cantidad: Math.max(1, Math.min(cantidad, producto.stock ?? cantidad)),
        pedida: cantidad,
      });
    }
  }
  return { lineas, omitidas, totalProductos: pedidas.size };
}

function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** Texto del aviso al terminar: «Agregamos 3 de 4 productos; X ya no está disponible.» */
export function resumenVolverAPedir(plan: PlanVolverAPedir): string {
  const agregados = plan.lineas.length;
  const partes: string[] = [
    `Agregamos ${agregados} de ${plan.totalProductos} ${plan.totalProductos === 1 ? 'producto' : 'productos'}`,
  ];
  if (plan.omitidas.length > 0) {
    const nombres = unirNombres(plan.omitidas.map((omitida) => omitida.nombre));
    partes.push(`${nombres} ya no ${plan.omitidas.length === 1 ? 'está disponible' : 'están disponibles'}`);
  }
  const reducidas = plan.lineas.filter((linea) => linea.cantidad < linea.pedida);
  if (reducidas.length > 0) {
    partes.push(
      reducidas.map((linea) => `de ${linea.producto.nombre} solo quedan ${linea.cantidad}`).join(', '),
    );
  }
  return `${partes.join('; ')}.`;
}
