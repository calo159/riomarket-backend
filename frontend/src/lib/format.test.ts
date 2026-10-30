import { afterEach, describe, expect, it, vi } from 'vitest';
import { colorEstado, etiquetaEstado, formatearCalificacion, hoyBogota, OPCIONES_FILTRO_PEDIDO, ETIQUETAS_PEDIDO } from './format';

describe('hoyBogota', () => {
  afterEach(() => vi.useRealTimers());

  it('después de las 19:00 en Bogotá sigue siendo el mismo día (UTC ya cambió)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T02:30:00Z')); // 21:30 del 10 en Bogotá
    expect(hoyBogota()).toBe('2026-03-10');
  });

  it('a media mañana coincide con la fecha local', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T15:00:00Z'));
    expect(hoyBogota()).toBe('2026-03-10');
  });
});

describe('formatearCalificacion', () => {
  it('muestra un decimal y el texto indicado si no hay reseñas', () => {
    expect(formatearCalificacion(4.25)).toBe('4.3');
    expect(formatearCalificacion(null)).toBe('Sin reseñas');
    expect(formatearCalificacion(null, '—')).toBe('—');
  });
});

describe('OPCIONES_FILTRO_PEDIDO', () => {
  it('cubre todos los estados de pedido, en el mismo orden', () => {
    expect(OPCIONES_FILTRO_PEDIDO.map((o) => o.valor)).toEqual(Object.keys(ETIQUETAS_PEDIDO));
  });
});

describe('estado listo para recoger', () => {
  it('tiene etiqueta, opción de filtro y color propio', () => {
    expect(etiquetaEstado('listo_para_recoger')).toBe('Listo para recoger');
    expect(OPCIONES_FILTRO_PEDIDO.find((o) => o.valor === 'listo_para_recoger')?.etiqueta).toBe('Listos para recoger');
    expect(colorEstado('listo_para_recoger')).not.toBe(colorEstado('en_camino'));
    expect(colorEstado('listo_para_recoger')).toContain('teal');
  });
});
