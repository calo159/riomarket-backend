import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Estrellas } from './Estrellas';

/** Cuenta estrellas llenas, medias (la llena recortada a la mitad) y vacías, sin contar el relleno de las medias. */
function contar(valor: number) {
  const { container } = render(<Estrellas valor={valor} />);
  const medias = container.querySelectorAll('[class*="clip-path"]').length;
  const llenas = Array.from(container.querySelectorAll('svg.fill-estrella')).filter((s) => !s.closest('[class*="clip-path"]')).length;
  const total = container.querySelectorAll('svg').length - medias; // cada media tiene dos svg: la base cuenta como la estrella
  return { llenas, medias, vacias: total - llenas - medias };
}

describe('Estrellas', () => {
  it('un_4_5_son_cuatro_estrellas_y_media_no_cinco', () => {
    expect(contar(4.5)).toEqual({ llenas: 4, medias: 1, vacias: 0 });
  });

  it('los_enteros_se_dibujan_exactos', () => {
    expect(contar(5)).toEqual({ llenas: 5, medias: 0, vacias: 0 });
    expect(contar(3)).toEqual({ llenas: 3, medias: 0, vacias: 2 });
    expect(contar(0)).toEqual({ llenas: 0, medias: 0, vacias: 5 });
  });

  it('redondea_al_cuarto_mas_cercano', () => {
    expect(contar(3.2)).toEqual({ llenas: 3, medias: 0, vacias: 2 });
    expect(contar(3.3)).toEqual({ llenas: 3, medias: 1, vacias: 1 });
    expect(contar(3.8)).toEqual({ llenas: 4, medias: 0, vacias: 1 });
  });

  it('se_anuncia_una_sola_vez_con_su_etiqueta', () => {
    const { getByRole } = render(<Estrellas valor={4.5} etiqueta="Calificación 4,5 de 5" />);
    expect(getByRole('img', { name: 'Calificación 4,5 de 5' })).toBeInTheDocument();
  });
});
