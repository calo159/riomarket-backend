import { afterEach, describe, expect, it, vi } from 'vitest';
import { hoyBogota } from './format';

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
