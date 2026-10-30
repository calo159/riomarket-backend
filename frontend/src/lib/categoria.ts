/**
 * Color de categoría: cada categoría tiene siempre el mismo de los cuatro colores de la canasta,
 * calculado solo desde su id. El color significa categoría (nunca estado) en bloques, chips y
 * fallbacks de imagen.
 */
export type ColorCategoria = 'azul' | 'rojo' | 'amarillo' | 'verde';

const ORDEN: ColorCategoria[] = ['azul', 'rojo', 'amarillo', 'verde'];

export interface ClasesCategoria {
  color: ColorCategoria;
  /** Bloque macizo con texto legible (blanco sobre azul, rojo y verde; tinta sobre amarillo). */
  bloque: string;
  /** Anillo de foco que se ve sobre el bloque. */
  foco: string;
  /** Color de las ranuras de la retícula sobre el bloque. */
  ranuras: string;
  /** Chip sin seleccionar: borde y texto del color, fondo del tema. */
  chip: string;
  /** Chip seleccionado: macizo. */
  chipActivo: string;
  /** Punto de color para listas. */
  punto: string;
}

const CLASES: Record<ColorCategoria, Omit<ClasesCategoria, 'color'>> = {
  azul: {
    bloque: 'bg-brand-600 text-white dark:bg-brand-500',
    foco: 'focus-visible:ring-white focus-visible:ring-offset-brand-600 dark:focus-visible:ring-offset-brand-500',
    ranuras: 'text-slate-950/25',
    chip: 'border-brand-600 text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-200 dark:hover:bg-brand-950',
    chipActivo: 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500',
    punto: 'bg-brand-600 dark:bg-brand-400',
  },
  rojo: {
    bloque: 'bg-rojo-600 text-white',
    foco: 'focus-visible:ring-white focus-visible:ring-offset-rojo-600',
    ranuras: 'text-slate-950/25',
    chip: 'border-rojo-600 text-rojo-700 hover:bg-rojo-50 dark:border-rojo-300 dark:text-rojo-200 dark:hover:bg-rojo-950',
    chipActivo: 'border-rojo-600 bg-rojo-600 text-white',
    punto: 'bg-rojo-600 dark:bg-rojo-400',
  },
  amarillo: {
    bloque: 'bg-sol-400 text-slate-950',
    foco: 'focus-visible:ring-slate-950 focus-visible:ring-offset-sol-400',
    ranuras: 'text-slate-950/20',
    chip: 'border-sol-600 text-sol-800 hover:bg-sol-50 dark:border-sol-400 dark:text-sol-300 dark:hover:bg-sol-950',
    chipActivo: 'border-sol-400 bg-sol-400 text-slate-950',
    punto: 'bg-sol-400',
  },
  verde: {
    bloque: 'bg-verde-600 text-white',
    foco: 'focus-visible:ring-white focus-visible:ring-offset-verde-600',
    ranuras: 'text-slate-950/25',
    chip: 'border-verde-600 text-verde-700 hover:bg-verde-50 dark:border-verde-300 dark:text-verde-200 dark:hover:bg-verde-950',
    chipActivo: 'border-verde-600 bg-verde-600 text-white',
    punto: 'bg-verde-600 dark:bg-verde-400',
  },
};

export function colorDeCategoria(id: number | null | undefined): ColorCategoria {
  const n = Number.isFinite(Number(id)) ? Math.abs(Math.trunc(Number(id))) : 0;
  return ORDEN[n % ORDEN.length];
}

export function clasesDeCategoria(id: number | null | undefined): ClasesCategoria {
  const color = colorDeCategoria(id);
  return { color, ...CLASES[color] };
}
