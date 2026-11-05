import { claveCategoria } from './iconos';

/**
 * Cartulinas de precio: en un puesto de mercado cada producto lleva su cartulina de color con el precio
 * escrito a mano. Aquí el color de la cartulina es el de su CATEGORÍA, así el color significa algo
 * (frutas = limón, dulces = guayaba, bebidas = mango…) en lugar de decorar.
 *
 * Cada fondo trae su tinta ya elegida para cumplir contraste AA (4,5:1 o más); lo comprueba `cartulina.test.ts`.
 * Sirven igual en claro y en oscuro: son colores de papel fluorescente, que de noche brillan bajo el bombillo.
 */
export interface Cartulina {
  fondo: string;
  tinta: string;
}

const TINTA = '#14262A';
const BLANCO = '#FFFFFF';

export const CARTULINAS: Record<ReturnType<typeof claveCategoria>, Cartulina> = {
  arepas: { fondo: '#F2E35A', tinta: TINTA }, // maíz
  frutas: { fondo: '#BFE23A', tinta: TINTA }, // limón
  pescados: { fondo: '#5FE3D0', tinta: TINTA }, // mar (más verdoso que el turquesa de la marca)
  comida: { fondo: '#D9303A', tinta: BLANCO }, // ají (rojo frío, lejos del coral de comprar)
  dulces: { fondo: '#FF7FA5', tinta: TINTA }, // guayaba
  bebidas: { fondo: '#FFA21F', tinta: TINTA }, // mango
  artesanias: { fondo: '#7C3AA8', tinta: BLANCO }, // corozo
  ropa: { fondo: '#4D5BD8', tinta: BLANCO }, // índigo
  generico: { fondo: '#DCE5E3', tinta: TINTA }, // sal
};

export function cartulinaDe(categoria?: string | null): Cartulina {
  return CARTULINAS[claveCategoria(categoria)];
}
