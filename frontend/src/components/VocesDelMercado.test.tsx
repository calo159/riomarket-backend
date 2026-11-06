import { describe, expect, it } from 'vitest';
import type { Resena } from '../lib/types';
import { seleccionarCitas } from './VocesDelMercado';

const resena = (id: number, extra: Record<string, unknown> = {}) =>
  ({
    id,
    id_puesto: id,
    calificacion: 5,
    comentario: 'Las arepas de huevo son las mejores de Riohacha.',
    usuario_nombre: 'Luis Fernando',
    ...extra,
  }) as unknown as Resena;

describe('seleccionarCitas', () => {
  it('descarta_las_mal_calificadas_y_las_de_una_palabra', () => {
    const citas = seleccionarCitas([
      resena(1, { calificacion: 3 }),
      resena(2, { comentario: 'Bueno' }),
      resena(3, { comentario: '   ' }),
      resena(4),
    ]);

    expect(citas.map((c) => c.id)).toEqual([4]);
  });

  it('solo_una_por_puesto_para_que_no_hable_siempre_el_mismo', () => {
    const citas = seleccionarCitas([resena(1, { id_puesto: 9 }), resena(2, { id_puesto: 9 }), resena(3, { id_puesto: 5 })]);

    expect(citas.map((c) => c.id)).toEqual([1, 3]);
  });

  it('como_mucho_tres', () => {
    expect(seleccionarCitas([1, 2, 3, 4, 5].map((i) => resena(i)))).toHaveLength(3);
  });
});
