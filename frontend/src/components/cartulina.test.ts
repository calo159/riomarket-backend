import { describe, expect, it } from 'vitest';
import { CARTULINAS, cartulinaDe } from './cartulina';

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe('cartulinas de precio', () => {
  it('la_tinta_de_cada_cartulina_cumple_contraste_AA', () => {
    for (const [clave, { fondo, tinta }] of Object.entries(CARTULINAS)) {
      expect(contraste(fondo, tinta), `${clave}: ${tinta} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('cada_categoria_tiene_su_color_y_son_distintos', () => {
    const fondos = Object.values(CARTULINAS).map((c) => c.fondo);
    expect(new Set(fondos).size).toBe(fondos.length);
  });

  it('se_elige_por_el_nombre_de_la_categoria_sin_importar_acentos_ni_mayusculas', () => {
    expect(cartulinaDe('Frutas y verduras')).toBe(CARTULINAS.frutas);
    expect(cartulinaDe('DULCES típicos')).toBe(CARTULINAS.dulces);
    expect(cartulinaDe('Artesanías')).toBe(CARTULINAS.artesanias);
    expect(cartulinaDe('Pescados y mariscos')).toBe(CARTULINAS.pescados);
  });

  it('una_categoria_desconocida_o_ausente_usa_la_cartulina_neutra', () => {
    expect(cartulinaDe('Ferretería')).toBe(CARTULINAS.generico);
    expect(cartulinaDe(null)).toBe(CARTULINAS.generico);
    expect(cartulinaDe(undefined)).toBe(CARTULINAS.generico);
  });
});
