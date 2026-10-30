import { describe, expect, it } from 'vitest';
import { clasesDeCategoria, colorDeCategoria } from './categoria';

describe('colorDeCategoria', () => {
  it('asigna siempre el mismo color a la misma categoría', () => {
    expect(colorDeCategoria(7)).toBe(colorDeCategoria(7));
  });

  it('reparte las categorías entre los cuatro colores', () => {
    const colores = new Set([1, 2, 3, 4].map(colorDeCategoria));
    expect(colores.size).toBe(4);
  });

  it('tolera ids ausentes o inválidos', () => {
    expect(colorDeCategoria(null)).toBe('azul');
    expect(colorDeCategoria(undefined)).toBe('azul');
    expect(colorDeCategoria(Number.NaN)).toBe('azul');
  });

  it('usa tinta sobre el amarillo', () => {
    const amarillo = [1, 2, 3, 4].map(clasesDeCategoria).find((c) => c.color === 'amarillo');
    expect(amarillo?.bloque).toContain('text-slate-950');
  });
});
