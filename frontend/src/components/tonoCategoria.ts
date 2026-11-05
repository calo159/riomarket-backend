import type { CSSProperties } from 'react';
import { claveCategoria } from './iconos';

/**
 * Tono de cada categoría para los chips pequeños (por ejemplo, las categorías de un puesto). Son colores apagados y
 * parejos entre sí (la misma luminosidad y poca saturación), de pintura de mercado: nada de colores vivos que compitan con
 * las fotos o con el coral de comprar. Cada tono trae su versión clara y su versión oscura, con contraste AA en ambas;
 * lo comprueba `tonoCategoria.test.ts`.
 */
export interface TonoCategoria {
  /** Punto de color apagado que acompaña al nombre de la categoría (decorativo). */
  punto: string;
  claro: { fondo: string; tinta: string };
  oscuro: { fondo: string; tinta: string };
}

export const TONOS: Record<ReturnType<typeof claveCategoria>, TonoCategoria> = {
  arepas: { punto: '#C9B02A', claro: { fondo: '#F6EFC8', tinta: '#5C4D00' }, oscuro: { fondo: '#3A3510', tinta: '#F0E7A8' } }, // maíz
  frutas: { punto: '#6E9A3A', claro: { fondo: '#E4EFD8', tinta: '#2B5210' }, oscuro: { fondo: '#22351A', tinta: '#CFE4B8' } }, // hoja
  pescados: { punto: '#2E9C94', claro: { fondo: '#D9EFEC', tinta: '#0F5550' }, oscuro: { fondo: '#12383A', tinta: '#BDE6E1' } }, // mar
  comida: { punto: '#C2412D', claro: { fondo: '#F6DDD6', tinta: '#7E2413' }, oscuro: { fondo: '#43211D', tinta: '#F5BFB2' } }, // ají
  dulces: { punto: '#B8466C', claro: { fondo: '#F5E1E8', tinta: '#7A2646' }, oscuro: { fondo: '#43202F', tinta: '#F3C4D5' } }, // guayaba
  bebidas: { punto: '#E8A020', claro: { fondo: '#FBE8C6', tinta: '#6E4200' }, oscuro: { fondo: '#46330F', tinta: '#F5D79B' } }, // mango
  artesanias: { punto: '#7B4C93', claro: { fondo: '#E9DFEF', tinta: '#4A2860' }, oscuro: { fondo: '#33263F', tinta: '#DAC7E6' } }, // corozo
  ropa: { punto: '#3D6FB0', claro: { fondo: '#DCE6F3', tinta: '#1F3F6B' }, oscuro: { fondo: '#1F3350', tinta: '#BCD0EA' } }, // añil
  generico: { punto: '#8D9B94', claro: { fondo: '#E6EAE7', tinta: '#34454E' }, oscuro: { fondo: '#1F3A3F', tinta: '#CAD5D1' } }, // sal
};

export function tonoDe(categoria?: string | null): TonoCategoria {
  return TONOS[claveCategoria(categoria)];
}

/** Variables CSS del tono: se usan con `bg-[var(--tono-fondo)] text-[var(--tono-tinta)] dark:bg-[var(--tono-fondo-o)] …`. */
export function variablesDeTono(categoria?: string | null): CSSProperties {
  const t = tonoDe(categoria);
  return {
    '--tono-fondo': t.claro.fondo,
    '--tono-tinta': t.claro.tinta,
    '--tono-fondo-o': t.oscuro.fondo,
    '--tono-tinta-o': t.oscuro.tinta,
  } as CSSProperties;
}
