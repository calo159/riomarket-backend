import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Reglas de arquitectura del frontend: las carpetas forman capas y solo dependen hacia abajo.
 * Ver `docs/ADR-017-arquitectura-en-capas.md`. La prueba lee los `import` (no ejecuta nada) y su mensaje dice
 * qué dependencia sobra y dónde.
 */
const SRC = __dirname;

// Cada carpeta importa solo de carpetas de nivel MENOR. Una carpeta nueva debe declararse aquí.
const NIVELES: Record<string, number> = {
  lib: 0, // utilidades puras: formato, errores, claves de caché, tipos
  api: 1, // peticiones al backend, definiciones de consultas y precarga
  auth: 2, // sesión y tokens
  navigation: 3, // menú y permisos del usuario (lee la sesión)
  cart: 3, // carrito (lee la sesión)
  components: 4, // piezas de interfaz reutilizables
  pages: 5, // pantallas
};
// `test/` son utilidades de prueba y puede importar de cualquiera; los archivos sueltos de `src/` (App, main)
// ensamblan la aplicación y tampoco tienen restricción, pero ninguna carpeta puede importarlos.
const SIN_RESTRICCION = new Set(['test']);

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.|api-types/.test(nombre) ? [ruta] : [];
  });
}

interface Arista {
  origen: string;
  destino: string;
  archivo: string;
}

function importsEntreCarpetas(): Arista[] {
  const aristas: Arista[] = [];
  for (const archivo of archivos(SRC)) {
    const partes = relative(SRC, archivo).split(sep);
    const carpeta = partes.length > 1 ? partes[0] : null; // null: archivo suelto de src/
    const codigo = readFileSync(archivo, 'utf-8');
    for (const m of codigo.matchAll(/(?:from|import)\s*\(?\s*'(\.[^']+)'/g)) {
      const resuelta = relative(SRC, normalize(join(dirname(archivo), m[1]))).split(sep);
      const destino = resuelta.length > 1 ? resuelta[0] : null;
      if (carpeta !== null && carpeta !== destino) {
        aristas.push({ origen: carpeta, destino: destino ?? '(archivo suelto de src/)', archivo: relative(SRC, archivo) });
      }
    }
  }
  return aristas;
}

describe('arquitectura del frontend', () => {
  it('toda carpeta declara su nivel', () => {
    const carpetas = readdirSync(SRC).filter((n) => statSync(join(SRC, n)).isDirectory());
    const sinNivel = carpetas.filter((c) => !(c in NIVELES) && !SIN_RESTRICCION.has(c));
    expect(sinNivel, `Carpeta(s) nueva(s) sin nivel en arquitectura.test.ts: ${sinNivel.join(', ')}`).toEqual([]);
    const fantasmas = Object.keys(NIVELES).filter((c) => !carpetas.includes(c));
    expect(fantasmas, `NIVELES nombra carpetas que ya no existen: ${fantasmas.join(', ')}`).toEqual([]);
  });

  it('las carpetas solo dependen de carpetas de nivel inferior', () => {
    const violaciones = importsEntreCarpetas()
      .filter(({ origen, destino }) => origen in NIVELES && !SIN_RESTRICCION.has(destino))
      .filter(({ origen, destino }) => !(destino in NIVELES) || NIVELES[destino] >= NIVELES[origen])
      .map(
        ({ origen, destino, archivo }) =>
          `${archivo}: «${origen}» (nivel ${NIVELES[origen]}) importa «${destino}»` +
          (destino in NIVELES ? ` (nivel ${NIVELES[destino]})` : '') +
          '. Mueve el código a la capa correcta o invierte la dependencia.',
      );
    expect(violaciones, `\n${violaciones.join('\n')}`).toEqual([]);
  });

  it('las utilidades de `lib` no conocen ni la red ni la interfaz', () => {
    const conocen = importsEntreCarpetas()
      .filter(({ origen }) => origen === 'lib')
      .map(({ archivo, destino }) => `${archivo} → ${destino}`);
    expect(conocen, `lib debe ser la capa más baja: ${conocen.join(', ')}`).toEqual([]);
  });
});
