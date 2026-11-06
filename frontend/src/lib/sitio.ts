import { useSyncExternalStore } from 'react';

/** La identidad del sitio que el administrador fija desde el panel (ADR-024). */
export interface Sitio {
  nombre_marca: string;
  ciudad: string;
  region: string;
  descripcion: string;
  color_marca: string;
  titular_inicio: string;
  titular_destacado: string;
  subtitulo_inicio: string;
  correo_soporte: string;
  whatsapp_soporte: string;
  instagram_url: string;
  facebook_url: string;
  texto_pie: string;
  nota_pagos: string;
  /** Color principal de la paleta elegida, para la barra del navegador. */
  color_tema: string;
}

/** Lo que rige cuando el administrador no ha cambiado nada: RioMarket en Riohacha. Espejo de `apps/configuracion/sitio.py`. */
export const SITIO_POR_DEFECTO: Sitio = {
  nombre_marca: 'RioMarket',
  ciudad: 'Riohacha',
  region: 'La Guajira · Colombia',
  descripcion: 'Compra en los puestos del mercado de Riohacha desde el celular: a domicilio o para recoger.',
  color_marca: 'turquesa',
  titular_inicio: 'Compra directo en los puestos de',
  titular_destacado: 'Riohacha',
  subtitulo_inicio:
    'Cada pedido es de un solo puesto: sabes quién lo prepara y a quién preguntarle. A domicilio o para recoger.',
  correo_soporte: '',
  whatsapp_soporte: '',
  instagram_url: '',
  facebook_url: '',
  texto_pie: 'El mercado de Riohacha en línea. Compra directo a vendedores de tu ciudad.',
  nota_pagos: 'Pagas en efectivo al recibir o al recoger.',
  color_tema: '#00626D',
};

/**
 * Lo que Django dejó en el HTML inicial (`<script id="sitio-config" type="application/json">`): así la primera pantalla
 * ya sale con el nombre y el color correctos, sin un parpadeo con los de RioMarket. Con `npm run dev` (sin Django) el
 * marcador queda sin reemplazar y se usan los de por defecto.
 */
function leerDelHtml(): Sitio {
  try {
    const texto = document.getElementById('sitio-config')?.textContent ?? '';
    if (texto && !texto.includes('__SITIO_JSON__')) return { ...SITIO_POR_DEFECTO, ...JSON.parse(texto) };
  } catch {
    // JSON dañado: se sigue con los de por defecto.
  }
  return SITIO_POR_DEFECTO;
}

let actual: Sitio = typeof document === 'undefined' ? SITIO_POR_DEFECTO : leerDelHtml();
const oyentes = new Set<() => void>();

export function sitioActual(): Sitio {
  return actual;
}

/** Nombre de la marca para los lugares que no son un componente (títulos de la pestaña, mensajes). */
export function nombreMarca(): string {
  return actual.nombre_marca;
}

/** Ciudad del mercado para los textos que no son un componente. */
export function ciudadSitio(): string {
  return actual.ciudad;
}

/** Título de la pestaña: «Parte · Marca». */
export function tituloPagina(...partes: string[]): string {
  return [...partes, actual.nombre_marca].join(' · ');
}

/** Pone el color de la marca en la página y avisa a los componentes que leen el sitio. */
export function aplicarSitio(sitio: Sitio): void {
  actual = sitio;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.marca = sitio.color_marca;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sitio.color_tema);
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
}

/** La identidad vigente del sitio; el componente se redibuja si el administrador la cambia. */
export function useSitio(): Sitio {
  return useSyncExternalStore(suscribir, sitioActual, sitioActual);
}

/** Cuando el administrador cambia la marca en la prueba o en otra pestaña: vuelve a lo de por defecto. */
export function reiniciarSitio(): void {
  aplicarSitio(SITIO_POR_DEFECTO);
}
