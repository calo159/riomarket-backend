import type { Page } from '@playwright/test';

export interface FalloDeContraste {
  texto: string;
  ratio: number;
  minimo: number;
  color: string;
  clase: string;
}

/**
 * Mide el contraste real de cada texto visible de la página contra su fondo (composición de las capas con
 * transparencia hasta el primer fondo opaco) y devuelve los que quedan por debajo de AA: 4,5:1, o 3:1 si el texto es
 * grande (24 px, o 18,66 px en negrita). Los textos sobre fotos o degradados se omiten: sus estilos no dicen qué
 * hay detrás. Sirve igual en claro y en oscuro.
 */
export async function medirContraste(page: Page): Promise<FalloDeContraste[]> {
  return page.evaluate(() => {
    const num = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const rgba = (s: string): number[] => {
      const n = num(s);
      return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
    };
    const luminancia = ([r, g, b]: number[]) => {
      const f = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const mezclar = (fg: number[], bg: number[]) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));

    /**
     * Un fondo sólido que NO es de un contenedor del texto pero está justo debajo de él (por ejemplo, la pastilla
     * deslizante de un selector, que es hermana de los botones). Mira qué hay pintado bajo el centro del texto: si lo
     * primero que aparece después del propio texto es un contenedor suyo, sigue la cadena de contenedores de siempre.
     */
    const fondoHermano = (el: Element): number[] | null => {
      const caja = el.getBoundingClientRect();
      for (const otro of document.elementsFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2)) {
        if (el.contains(otro)) continue;
        if (otro.contains(el)) return null;
        const cs = getComputedStyle(otro);
        const c = rgba(cs.backgroundColor);
        return c[3] >= 1 && cs.backgroundImage === 'none' ? c.slice(0, 3) : null;
      }
      return null;
    };

    const fondoDe = (el: Element): number[] | null => {
      const hermano = fondoHermano(el);
      if (hermano) return hermano;
      const capas: number[][] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== 'none') return null;
        const c = rgba(cs.backgroundColor);
        if (c[3] > 0) capas.push(c);
        if (c[3] >= 1) break;
      }
      let base = [255, 255, 255];
      const ultima = capas[capas.length - 1];
      if (ultima && ultima[3] >= 1) {
        capas.pop();
        base = ultima.slice(0, 3);
      } else {
        const c = rgba(getComputedStyle(document.body).backgroundColor);
        if (c[3] > 0) base = c.slice(0, 3);
      }
      for (let i = capas.length - 1; i >= 0; i--) base = mezclar(capas[i], base);
      return base;
    };

    const fallos = new Map<string, { texto: string; ratio: number; minimo: number; color: string; clase: string }>();
    const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let nodo: Node | null;
    while ((nodo = recorrido.nextNode())) {
      const texto = (nodo.textContent ?? '').trim();
      const el = nodo.parentElement;
      if (!texto || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      const caja = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (caja.width < 2 || caja.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      if (el.closest('[aria-hidden="true"], .sr-only')) continue;
      const fondo = fondoDe(el);
      if (!fondo) continue;
      const color = mezclar(rgba(cs.color), fondo);
      const l1 = luminancia(color);
      const l2 = luminancia(fondo);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const px = parseFloat(cs.fontSize);
      const peso = parseInt(cs.fontWeight, 10) || 400;
      const minimo = px >= 24 || (px >= 18.66 && peso >= 700) ? 3 : 4.5;
      if (ratio < minimo) {
        const clase = el.className.toString().slice(0, 90);
        const clave = `${cs.color}|${cs.backgroundColor}|${clase}`;
        if (!fallos.has(clave)) fallos.set(clave, { texto: texto.slice(0, 40), ratio: Math.round(ratio * 100) / 100, minimo, color: cs.color, clase });
      }
    }
    return [...fallos.values()];
  });
}
