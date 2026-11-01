/**
 * Exporta los PNG de la marca a partir de los SVG de `public/` (los genera `scripts/generar_logo.py`):
 *   - public/icons/icon-192.png, icon-512.png   (ícono «any», con esquinas redondeadas)
 *   - public/icons/icon-maskable-512.png        (a sangre, con margen de seguridad para Android)
 *   - public/icons/apple-touch-icon.png         (a sangre, iOS aplica su propia máscara)
 *   - public/og-riomarket.png                   (1200 x 630, la imagen al compartir enlaces)
 *
 * Uso (desde `frontend/`, con `npm ci` hecho):  node scripts/exportar-marca.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const publico = (...partes) => resolve(raiz, 'public', ...partes);
const leer = (ruta) => readFileSync(ruta, 'utf-8');

const TURQUESA = '#00626D';
const interior = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const marcaConFondo = leer(publico('brand', 'marca.svg'));
const marcaSinFondo = interior(leer(publico('brand', 'marca-sin-fondo.svg')));
const lockup = leer(publico('brand', 'logo-horizontal-sobre-oscuro.svg'));
const lockupAncho = Number(lockup.match(/viewBox="0 0 ([\d.]+) 64"/)[1]);

/** Símbolo a sangre sobre turquesa, escalado para respetar la zona segura y centrado ópticamente. */
const aSangre = (escala) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${TURQUESA}"/>` +
  `<g transform="translate(32 32) scale(${escala}) translate(-32 -32.75)">${marcaSinFondo}</g></svg>`;

const fuente = readFileSync(
  resolve(raiz, 'node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2'),
).toString('base64');

const pagina = (cuerpo, ancho, alto) => `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: Figtree; font-weight: 300 900; src: url(data:font/woff2;base64,${fuente}) format('woff2'); }
  html, body { margin: 0; width: ${ancho}px; height: ${alto}px; background: transparent; }
  svg { display: block; }
</style>${cuerpo}`;

const navegador = await chromium.launch();

async function capturar(html, ancho, alto, destino, { transparente = false } = {}) {
  const hoja = await navegador.newPage({ viewport: { width: ancho, height: alto } });
  await hoja.setContent(pagina(html, ancho, alto));
  await hoja.evaluate(() => document.fonts.ready);
  const png = await hoja.screenshot({ omitBackground: transparente });
  writeFileSync(destino, png);
  await hoja.close();
  console.log(`${destino.replace(raiz, 'frontend')}  ${ancho}x${alto}  ${png.length} bytes`);
}

const ajustar = (svg, lado) => svg.replace('<svg ', `<svg width="${lado}" height="${lado}" `);

await capturar(ajustar(marcaConFondo, 192), 192, 192, publico('icons', 'icon-192.png'), { transparente: true });
await capturar(ajustar(marcaConFondo, 512), 512, 512, publico('icons', 'icon-512.png'), { transparente: true });
await capturar(ajustar(aSangre(0.74), 512), 512, 512, publico('icons', 'icon-maskable-512.png'));
await capturar(ajustar(aSangre(0.86), 180), 180, 180, publico('icons', 'apple-touch-icon.png'));

const anchoLogo = 900;
const altoLogo = Math.round((anchoLogo * 64) / lockupAncho);
await capturar(
  `<div style="width:1200px;height:630px;background:${TURQUESA};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px">
     ${lockup.replace('<svg ', `<svg width="${anchoLogo}" height="${altoLogo}" `)}
     <p style="margin:0;font:800 54px Figtree;color:#fff;letter-spacing:-0.01em">El mercado de Riohacha en línea</p>
   </div>`,
  1200,
  630,
  publico('og-riomarket.png'),
);

await navegador.close();
