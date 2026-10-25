const CLAVE_AVISO = 'riomarket.aviso';

export const CLAVE_REFRESH_TOKEN = 'riomarket.refresh';
export const CLAVE_AVISO_SESION = CLAVE_AVISO;

export function leerRefresh(): string | null {
  return null;
}

export function guardarRefresh(token: string): void {
  // Migrado: refresh ahora en cookie HttpOnly
}

export function limpiarRefresh(): void {
  // Migrado: refresh ahora en cookie HttpOnly
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
