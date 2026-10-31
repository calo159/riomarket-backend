/**
 * Productos por encargo (ADR-013): reglas compartidas por el producto, el carrito y el checkout.
 *
 * Un encargo no tiene stock: se hace por pedido, con un tiempo de preparación, y el comprador
 * escribe sus detalles (sabor, mensaje) y elige para cuándo lo quiere. Los límites repiten los
 * del servidor; el servidor es quien manda.
 */

/** Unidades máximas de un mismo encargo en un pedido. */
export const MAX_CANTIDAD_ENCARGO = 20;
/** Largo máximo de los detalles de un producto. */
export const MAX_DETALLES = 300;
/** Hasta cuántos días de anticipación se acepta un encargo. */
export const DIAS_MAXIMOS_ENCARGO = 60;
/** La hora se elige de a 15 minutos (``step`` del campo ``datetime-local`` = 900 s). */
export const PASO_MINUTOS = 15;

export const ETIQUETA_DETALLES_POR_DEFECTO = 'Detalles del encargo';

interface ConModalidad {
  modalidad?: string | null;
}

export function esEncargo(producto: ConModalidad | null | undefined): boolean {
  return producto?.modalidad === 'encargo';
}

/** Unidades que se pueden pedir de un producto: 20 en un encargo; el stock en uno con existencias. */
export function topeDe(producto: ConModalidad & { stock?: number | null }): number {
  return esEncargo(producto) ? MAX_CANTIDAD_ENCARGO : Math.max(0, producto.stock ?? 0);
}

/** «24 h», «36 h», «2 días» (múltiplos de 24 desde 48 h). */
export function formatearPreparacion(horas: number): string {
  if (horas >= 48 && horas % 24 === 0) return `${horas / 24} días`;
  return `${horas} h`;
}

/** Lo que se le pregunta al comprador; «Detalles del encargo» si el vendedor no escribió nada. */
export function etiquetaDeDetalles(etiqueta?: string | null): string {
  return etiqueta?.trim() || ETIQUETA_DETALLES_POR_DEFECTO;
}

interface LineaConPreparacion extends ConModalidad {
  preparacionHoras?: number | null;
}

/**
 * La fecha más pronto que se puede pedir: ahora + la mayor preparación entre los encargos,
 * redondeada hacia arriba al siguiente cuarto de hora. ``null`` si no hay encargos.
 */
export function fechaMinima(items: readonly LineaConPreparacion[], ahora: Date = new Date()): Date | null {
  const horas = items.filter(esEncargo).map((item) => item.preparacionHoras ?? 0);
  if (horas.length === 0) return null;
  const minima = new Date(ahora.getTime() + Math.max(...horas) * 3_600_000);
  const paso = PASO_MINUTOS * 60_000;
  return new Date(Math.ceil(minima.getTime() / paso) * paso);
}

/** La fecha más lejana que se acepta (60 días). */
export function fechaMaxima(ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + DIAS_MAXIMOS_ENCARGO * 86_400_000);
}

function dos(n: number): string {
  return String(n).padStart(2, '0');
}

/** Valor para ``<input type="datetime-local">`` (hora local, ``AAAA-MM-DDTHH:mm``). */
export function aValorLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Convierte lo que da el campo ``datetime-local`` a ISO con zona, o ``null`` si está vacío o es inválido. */
export function valorLocalAIso(valor: string): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

interface LineaConDetalles extends ConModalidad {
  pideDetalles?: boolean;
  detalles?: string;
}

/** Líneas por encargo que piden detalles y todavía no los tienen. */
export function lineasSinDetalles<T extends LineaConDetalles>(items: readonly T[]): T[] {
  return items.filter((item) => esEncargo(item) && item.pideDetalles && !(item.detalles ?? '').trim());
}
