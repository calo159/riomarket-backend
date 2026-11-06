import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'paletasMarca.css'), 'utf-8');
const bloques = [...css.matchAll(/(:root|html\[data-marca='(\w+)'\])\s*\{([^}]*)\}/g)].map((m) => ({
  nombre: m[2] ?? 'turquesa',
  variables: Object.fromEntries([...m[3].matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map((v) => [v[1], [+v[2], +v[3], +v[4]]])),
}));

function luminancia([r, g, b]: number[]) {
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contraste(a: number[], b: number[]) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}
const BLANCO = [255, 255, 255];

describe('paletas de la marca', () => {
  it('están las cinco que ofrece el panel (las mismas del servidor)', () => {
    expect(bloques.map((b) => b.nombre)).toEqual(['turquesa', 'azul', 'verde', 'ciruela', 'pizarra']);
  });

  it('cada paleta trae toda la escala y los tonos del primer pliegue', () => {
    for (const { nombre, variables } of bloques) {
      for (const n of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
        expect(variables[`brand-${n}`], `${nombre} brand-${n}`).toBeDefined();
      }
      for (const v of ['hero-a', 'hero-b', 'hero-oscuro-a', 'hero-oscuro-b']) {
        expect(variables[v], `${nombre} ${v}`).toBeDefined();
      }
    }
  });

  it('el texto blanco sobre el color principal se lee en todas (AA, 4,5:1)', () => {
    for (const { nombre, variables } of bloques) {
      expect(contraste(BLANCO, variables['brand-600']), nombre).toBeGreaterThanOrEqual(4.5);
      expect(contraste(BLANCO, variables['hero-b']), `${nombre} hero-b`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('los enlaces (700 sobre blanco) y los de la noche (300 sobre el fondo oscuro) se leen en todas', () => {
    for (const { nombre, variables } of bloques) {
      expect(contraste(variables['brand-700'], BLANCO), `${nombre} 700`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(variables['brand-300'], variables['brand-950']), `${nombre} 300/950`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(BLANCO, variables['hero-oscuro-a']), `${nombre} hero oscuro`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
