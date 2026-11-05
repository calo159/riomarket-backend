import { expect, test } from './fixtures';
import { medirContraste } from './contraste';

/**
 * El modo oscuro no puede degradarse en silencio. Un texto con un gris pensado para el modo claro y sin versión
 * oscura queda a 2:1 y no lo detecta ninguna otra prueba; aquí se mide el contraste real de cada texto de las
 * pantallas públicas, en oscuro y en claro (ver docs: el modo oscuro y la rampa de texto de index.css).
 */

for (const esquema of ['dark', 'light'] as const) {
  test.describe(`contraste en modo ${esquema === 'dark' ? 'oscuro' : 'claro'}`, () => {
    test.use({ colorScheme: esquema });

    for (const [nombre, ruta] of [
      ['la tienda', '/tienda'],
      ['el catálogo', '/catalogo'],
      ['el inicio de sesión', '/login'],
      ['el registro', '/registro'],
    ] as const) {
      test(`${nombre} cumple el contraste AA`, async ({ page }) => {
        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        // Se recorre la página para que se revele lo que entra al hacer scroll.
        const alto = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < Math.min(alto, 6000); y += 600) {
          await page.evaluate((v) => window.scrollTo(0, v), y);
          await page.waitForTimeout(80);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        const fallos = await medirContraste(page);
        expect(fallos, JSON.stringify(fallos, null, 2)).toEqual([]);
      });
    }
  });
}
