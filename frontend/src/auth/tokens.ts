const CLAVE_REFRESH = 'riomarket.refresh';
const CLAVE_AVISO = 'riomarket.aviso';

export const CLAVE_REFRESH_TOKEN = CLAVE_REFRESH;
export const CLAVE_AVISO_SESION = CLAVE_AVISO;

export function leerRefresh(): string | null {
  try {
    return localStorage.getItem(CLAVE_REFRESH);
  } catch {
    return null;
  }
}

export function guardarRefresh(token: string): void {
  try {
    localStorage.setItem(CLAVE_REFRESH, token);
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function limpiarRefresh(): void {
  try {
    localStorage.removeItem(CLAVE_REFRESH);
  } catch {
    /* sin acceso al almacenamiento */
  }
}

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
