import { describe, expect, it } from 'vitest';
import { TONOS, tonoDe, variablesDeTono } from './tonoCategoria';

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

describe('tonos de categoría', () => {
  it('cada_tono_cumple_contraste_AA_en_claro_y_en_oscuro', () => {
    for (const [clave, { claro, oscuro }] of Object.entries(TONOS)) {
      expect(contraste(claro.tinta, claro.fondo), `${clave} claro`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(oscuro.tinta, oscuro.fondo), `${clave} oscuro`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('son_apagados_y_parejos_no_colores_vivos', () => {
    // El fondo claro de cada tono es casi blanco: luminancia alta y poco rango entre tonos.
    const luminancias = Object.values(TONOS).map((t) => luminancia(t.claro.fondo));
    expect(Math.min(...luminancias)).toBeGreaterThan(0.7);
    expect(Math.max(...luminancias) - Math.min(...luminancias)).toBeLessThan(0.2);
  });

  it('se_elige_por_el_nombre_de_la_categoria_sin_importar_acentos_ni_mayusculas', () => {
    expect(tonoDe('Frutas y verduras')).toBe(TONOS.frutas);
    expect(tonoDe('DULCES típicos')).toBe(TONOS.dulces);
    expect(tonoDe('Artesanías')).toBe(TONOS.artesanias);
  });

  it('una_categoria_desconocida_o_ausente_usa_el_tono_neutro', () => {
    expect(tonoDe('Ferretería')).toBe(TONOS.generico);
    expect(tonoDe(null)).toBe(TONOS.generico);
  });

  it('cada_tono_trae_un_punto_de_color_apagado_para_acompanar_el_nombre', () => {
    for (const [clave, tono] of Object.entries(TONOS)) {
      expect(tono.punto, clave).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(new Set(Object.values(TONOS).map((t) => t.punto)).size).toBe(Object.keys(TONOS).length);
  });

  it('entrega_las_variables_css_del_tono', () => {
    expect(variablesDeTono('Frutas')).toMatchObject({ '--tono-fondo': '#E4EFD8', '--tono-tinta-o': '#CFE4B8' });
  });
});
