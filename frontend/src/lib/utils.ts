import { clsx, type ClassValue } from 'clsx';

export function cn(...clases: ClassValue[]): string {
  return clsx(clases);
}

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;

export function validarImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    return 'Usa una imagen JPEG, PNG o WebP.';
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return 'La imagen supera el tamaño máximo de 2 MB.';
  }
  return null;
}

/** Solo rutas internas: evita redirecciones abiertas tras el login. */
export function rutaInternaSegura(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (!valor.startsWith('/') || valor.startsWith('//')) return null;
  if (valor.includes('://') || valor.includes('\\')) return null;
  // Volver a /login o /registro dejaría al usuario ya autenticado en un bucle.
  if (/^\/(login|registro)(\/|\?|#|$)/.test(valor)) return null;
  return valor;
}

export function urlAbsoluta(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
