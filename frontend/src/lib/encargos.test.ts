import { describe, expect, it } from 'vitest';
import {
  MAX_CANTIDAD_ENCARGO,
  aValorLocal,
  esEncargo,
  etiquetaDeDetalles,
  fechaMaxima,
  fechaMinima,
  formatearPreparacion,
  lineasSinDetalles,
  topeDe,
  valorLocalAIso,
} from './encargos';

describe('esEncargo / topeDe', () => {
  it('un producto sin modalidad (datos viejos) es de stock', () => {
    expect(esEncargo({})).toBe(false);
    expect(esEncargo(undefined)).toBe(false);
    expect(topeDe({ stock: 7 })).toBe(7);
  });

  it('un encargo ignora el stock y topa en 20', () => {
    expect(esEncargo({ modalidad: 'encargo' })).toBe(true);
    expect(topeDe({ modalidad: 'encargo', stock: 0 })).toBe(MAX_CANTIDAD_ENCARGO);
    expect(topeDe({ modalidad: 'encargo', stock: 500 })).toBe(20);
  });

  it('un producto de stock agotado o sin dato tiene tope 0', () => {
    expect(topeDe({ modalidad: 'stock', stock: 0 })).toBe(0);
    expect(topeDe({ modalidad: 'stock', stock: null })).toBe(0);
  });
});

describe('formatearPreparacion', () => {
  it.each([
    [1, '1 h'],
    [24, '24 h'],
    [36, '36 h'],
    [48, '2 días'],
    [72, '3 días'],
    [60, '60 h'],
    [336, '14 días'],
  ])('%i horas -> %s', (horas, texto) => {
    expect(formatearPreparacion(horas)).toBe(texto);
  });
});

describe('etiquetaDeDetalles', () => {
  it('usa la del vendedor o la de siempre', () => {
    expect(etiquetaDeDetalles('Sabor y mensaje')).toBe('Sabor y mensaje');
    expect(etiquetaDeDetalles('  ')).toBe('Detalles del encargo');
    expect(etiquetaDeDetalles(undefined)).toBe('Detalles del encargo');
  });
});

describe('fechaMinima', () => {
  const ahora = new Date('2026-11-01T15:07:00Z');

  it('es null si no hay encargos', () => {
    expect(fechaMinima([{ modalidad: 'stock' }, {}], ahora)).toBeNull();
    expect(fechaMinima([], ahora)).toBeNull();
  });

  it('suma la mayor preparación y redondea al siguiente cuarto de hora', () => {
    const minima = fechaMinima(
      [
        { modalidad: 'encargo', preparacionHoras: 12 },
        { modalidad: 'encargo', preparacionHoras: 24 },
        { modalidad: 'stock' },
      ],
      ahora,
    );
    expect(minima?.toISOString()).toBe('2026-11-02T15:15:00.000Z');
  });

  it('no mueve una hora que ya cae en un cuarto', () => {
    const exacta = new Date('2026-11-01T15:00:00Z');
    expect(fechaMinima([{ modalidad: 'encargo', preparacionHoras: 2 }], exacta)?.toISOString()).toBe(
      '2026-11-01T17:00:00.000Z',
    );
  });

  it('la máxima es 60 días después', () => {
    expect(fechaMaxima(ahora).toISOString()).toBe('2026-12-31T15:07:00.000Z');
  });
});

describe('fecha local', () => {
  it('ida y vuelta entre el campo datetime-local y el ISO con zona', () => {
    const fecha = new Date(2026, 10, 5, 16, 30);
    expect(aValorLocal(fecha)).toBe('2026-11-05T16:30');
    expect(valorLocalAIso('2026-11-05T16:30')).toBe(fecha.toISOString());
  });

  it('un valor vacío o inválido no es una fecha', () => {
    expect(valorLocalAIso('')).toBeNull();
    expect(valorLocalAIso('no es fecha')).toBeNull();
  });
});

describe('lineasSinDetalles', () => {
  it('solo marca los encargos que piden detalles y no los tienen', () => {
    const items = [
      { modalidad: 'encargo' as const, pideDetalles: true, detalles: '  ' },
      { modalidad: 'encargo' as const, pideDetalles: true, detalles: 'Fresa' },
      { modalidad: 'encargo' as const, pideDetalles: false, detalles: '' },
      { modalidad: 'stock' as const, pideDetalles: true, detalles: '' },
      {},
    ];
    expect(lineasSinDetalles(items)).toEqual([items[0]]);
  });
});
