const CLAVE_AVISO = 'riomarket.aviso';


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
