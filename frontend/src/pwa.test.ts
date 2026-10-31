import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const publico = path.resolve(__dirname, '../public');
const leer = (archivo: string) => readFileSync(path.join(publico, archivo), 'utf-8');

interface Icono {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

describe('manifest.webmanifest', () => {
  const manifest = JSON.parse(leer('manifest.webmanifest')) as Record<string, unknown> & { icons: Icono[] };

  it('es JSON válido con los campos de una app instalable', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBe('RioMarket');
    expect(manifest.description).toBeTruthy();
    expect(manifest.lang).toBe('es');
    expect(manifest.start_url).toBe('/tienda');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#00626D');
    expect(manifest.background_color).toBe('#ffffff');
  });

  it('declara los íconos 192, 512 y maskable 512, y los archivos existen y son livianos', () => {
    const porTamano = (tamano: string, proposito: string) =>
      manifest.icons.find((i) => i.sizes === tamano && (i.purpose ?? 'any') === proposito);
    const requeridos = [porTamano('192x192', 'any'), porTamano('512x512', 'any'), porTamano('512x512', 'maskable')];
    for (const icono of requeridos) {
      expect(icono).toBeDefined();
      expect(icono!.type).toBe('image/png');
      const ruta = path.join(publico, icono!.src);
      expect(existsSync(ruta), icono!.src).toBe(true);
      expect(statSync(ruta).size).toBeLessThan(20 * 1024);
    }
  });

  it('el apple-touch-icon existe', () => {
    expect(existsSync(path.join(publico, 'icons/apple-touch-icon.png'))).toBe(true);
  });
});

describe('index.html', () => {
  const html = readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

  it('enlaza el manifest, el color del tema y el ícono de Apple', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('<meta name="theme-color" content="#00626D"');
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
  });
});

describe('service worker', () => {
  const sw = leer('sw.js');
  // Solo el código: los comentarios pueden nombrar /api o /media para explicar qué NO se toca.
  const codigo = sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('solo precachea la página sin conexión y su script', () => {
    expect(sw).toMatch(/PRECACHE = \[PAGINA_SIN_CONEXION, '\/offline\.js'\]/);
    expect(sw).toContain("'/offline.html'");
  });

  it('no guarda en caché respuestas de la red (ni assets ni API)', () => {
    expect(codigo).not.toMatch(/\.put\(/);
    expect(codigo).not.toMatch(/\/api|\/assets|\/media/);
  });

  it('atiende solo navegaciones con la página sin conexión como respaldo', () => {
    expect(sw).toContain("peticion.mode === 'navigate'");
    expect(sw).toContain('caches.match(PAGINA_SIN_CONEXION)');
  });

  it('la página sin conexión existe, tiene el botón Reintentar y no usa scripts en línea', () => {
    const offline = leer('offline.html');
    expect(offline).toContain('Reintentar');
    expect(offline).toContain('<span>Market</span>');
    expect(offline).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(offline).not.toMatch(/\son[a-z]+=/);
    expect(existsSync(path.join(publico, 'offline.js'))).toBe(true);
  });
});
