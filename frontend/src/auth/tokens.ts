const CLAVE_AVISO = 'riomarket.aviso';

export function guardarAvisoSesion(mensaje: string): void {
  try {
    sessionStorage.setItem(CLAVE_AVISO, mensaje);
  } catch {
    /* sin acceso al almacenamiento */
  }
}

export function leerAvisoSesion(): string | null {
  try {
    const valor = sessionStorage.getItem(CLAVE_AVISO);
    sessionStorage.removeItem(CLAVE_AVISO);
    return valor;
  } catch {
    return null;
  }
}

/**
 * Pista de sesión: el servidor la deja junto a la cookie de refresco (HttpOnly, que el
 * JavaScript no puede ver). Sin ella no hay sesión que restaurar, así que un visitante anónimo no
 * espera un viaje al servidor (que acabaría en 401) antes de ver la página. No contiene nada
 * secreto: solo «1». Quien manda sigue siendo el refresh HttpOnly y el JWT.
 */
export const COOKIE_PISTA_SESION = 'rm_hay_sesion';

/** Con la API en otro dominio la cookie no es legible desde aquí: no se puede confiar en ella. */
function apiEnOtroDominio(): boolean {
  const base = import.meta.env.VITE_API_URL;
  if (!base) return false;
  try {
    return new URL(base, window.location.origin).hostname !== window.location.hostname;
  } catch {
    return true;
  }
}

/** ¿Vale la pena intentar restaurar la sesión? (Ante la duda, sí.) */
export function hayPistaDeSesion(): boolean {
  if (apiEnOtroDominio()) return true;
  try {
    return document.cookie.split(';').some((parte) => parte.trim().startsWith(`${COOKIE_PISTA_SESION}=`));
  } catch {
    return true;
  }
}

/** Borra la pista cuando se sabe que ya no hay sesión (el servidor también la borra en el 401). */
export function borrarPistaDeSesion(): void {
  try {
    document.cookie = `${COOKIE_PISTA_SESION}=; Max-Age=0; path=/`;
  } catch {
    /* sin acceso a las cookies */
  }
}
