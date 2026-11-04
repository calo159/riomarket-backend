import { describe, expect, it } from 'vitest';
import { ETIQUETAS_ACCION, resumenDetalle } from './auditoria';

describe('resumenDetalle', () => {
  it('un cambio de campo dice de qué a qué y el motivo', () => {
    expect(resumenDetalle({ campo: 'rol', de: 'comprador', a: 'vendedor', motivo: 'Pidió vender' })).toBe(
      'rol: comprador → vendedor · Motivo: Pidió vender',
    );
  });

  it('una transición de estado muestra solo el cambio', () => {
    expect(resumenDetalle({ de: 'pendiente', a: 'confirmado' })).toBe('pendiente → confirmado');
  });

  it('un valor vacío se muestra como raya, no como texto en blanco', () => {
    expect(resumenDetalle({ campo: 'contraseña', de: '', a: 'restablecida', motivo: 'Olvidó la suya' })).toBe(
      'contraseña: — → restablecida · Motivo: Olvidó la suya',
    );
  });

  it('un detalle libre se lista clave por clave', () => {
    expect(resumenDetalle({ rol: 'vendedor', origen: 'administrador' })).toBe('rol: vendedor · origen: administrador');
  });

  it('un motivo solo no deja un separador colgando', () => {
    expect(resumenDetalle({ motivo: 'Por política' })).toBe('Motivo: Por política');
  });

  it('un valor anidado se muestra como JSON', () => {
    expect(resumenDetalle({ filtros: { a: 1 } })).toBe('filtros: {"a":1}');
  });

  it.each([null, undefined, {}, [], 'texto', 7])('sin detalle útil (%j) no devuelve nada', (valor) => {
    expect(resumenDetalle(valor)).toBe('');
  });

  it('recorta lo muy largo', () => {
    const largo = resumenDetalle({ nota: 'x'.repeat(500) });
    expect(largo.length).toBeLessThanOrEqual(220);
    expect(largo.endsWith('…')).toBe(true);
  });
});

describe('ETIQUETAS_ACCION', () => {
  it('tiene una etiqueta legible para cada acción del servidor', () => {
    for (const accion of ['crear', 'actualizar', 'eliminar', 'transicion', 'aprobar', 'vencimiento']) {
      expect(ETIQUETAS_ACCION[accion]).toBeTruthy();
    }
  });
});
