import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf-8');

function regla(selector: string): string {
  const inicio = css.indexOf(`${selector} {`);
  expect(inicio, `no existe ${selector}`).toBeGreaterThan(-1);
  return css.slice(inicio, css.indexOf('}', inicio));
}

describe('animaciones que envuelven a toda una pantalla', () => {
  it('la entrada de página no conserva el último cuadro', () => {
    // Con `both` o `forwards` el navegador sigue tratando la página como «animada» y los elementos
    // `position: fixed` de dentro (barra de compra, barra del carrito) se colocan respecto a ella y no a la ventana.
    expect(regla('.ruta-entra')).toMatch(/animation:[^;]*\bbackwards\b/);
    expect(regla('.ruta-entra')).not.toMatch(/\b(both|forwards)\b/);
  });

  it('las tarjetas de una cuadrícula tampoco', () => {
    expect(regla('.entra-lista > *')).not.toMatch(/\b(both|forwards)\b/);
  });

  it('la cascada de entrada del panel y la de las opciones del menú tampoco', () => {
    expect(regla('.panel-pagina > div > *')).toMatch(/animation:[^;]*\bbackwards\b/);
    expect(regla('.panel-pagina > div > *')).not.toMatch(/\b(both|forwards)\b/);
    expect(regla('.menu-entra .menu-opcion')).toMatch(/animation:[^;]*\bbackwards\b/);
  });

  it('con «reducir movimiento» se apagan también las transiciones entre pantallas', () => {
    const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(bloque).toMatch(/::view-transition-old\(\*\)/);
    expect(bloque).toMatch(/animation: none !important/);
  });
});
