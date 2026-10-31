import { describe, expect, it } from 'vitest';
import { estaPorVencer, msRestantes, textoCuentaRegresiva, yaVencio } from './plazo';

const AHORA = new Date('2026-10-31T12:00:00Z').getTime();
const en = (minutos: number) => new Date(AHORA + minutos * 60_000).toISOString();

describe('plazo', () => {
  it('sin plazo no hay cuenta ni aviso', () => {
    expect(msRestantes(null, AHORA)).toBeNull();
    expect(textoCuentaRegresiva(undefined, AHORA)).toBe('');
    expect(estaPorVencer(null, AHORA)).toBe(false);
    expect(yaVencio(null, AHORA)).toBe(false);
  });

  it('una fecha inválida se trata como sin plazo', () => {
    expect(msRestantes('no-es-fecha', AHORA)).toBeNull();
  });

  it('cuenta regresiva legible en días, horas y minutos', () => {
    expect(textoCuentaRegresiva(en(26 * 60 + 5), AHORA)).toBe('Quedan 1 día 2 h');
    expect(textoCuentaRegresiva(en(3 * 24 * 60), AHORA)).toBe('Quedan 3 días');
    expect(textoCuentaRegresiva(en(5 * 60 + 20), AHORA)).toBe('Quedan 5 h 20 min');
    expect(textoCuentaRegresiva(en(2 * 60), AHORA)).toBe('Quedan 2 h');
    expect(textoCuentaRegresiva(en(45), AHORA)).toBe('Quedan 45 min');
    expect(textoCuentaRegresiva(new Date(AHORA + 30_000).toISOString(), AHORA)).toBe('Queda menos de 1 minuto');
  });

  it('vencido: lo dice sin números negativos', () => {
    expect(textoCuentaRegresiva(en(-1), AHORA)).toBe('El plazo ya venció');
    expect(textoCuentaRegresiva(en(0), AHORA)).toBe('El plazo ya venció');
    expect(yaVencio(en(0), AHORA)).toBe(true);
  });

  it('«por vencer» son las últimas 2 horas, y solo si no ha vencido', () => {
    expect(estaPorVencer(en(121), AHORA)).toBe(false);
    expect(estaPorVencer(en(120), AHORA)).toBe(true);
    expect(estaPorVencer(en(1), AHORA)).toBe(true);
    expect(estaPorVencer(en(0), AHORA)).toBe(false);
    expect(estaPorVencer(en(-5), AHORA)).toBe(false);
  });
});
