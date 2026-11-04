import { api } from './http';

export interface ResultadoDescarga {
  nombre: string;
  /** Filas que salieron en el archivo (`null` si el servidor no lo informó). */
  filas: number | null;
  /** El servidor cortó la exportación en su tope: conviene afinar los filtros. */
  truncado: boolean;
}

function nombreDe(cabecera: string | undefined, porDefecto: string): string {
  const coincidencia = /filename="?([^";]+)"?/i.exec(cabecera ?? '');
  return coincidencia ? coincidencia[1] : porDefecto;
}

/**
 * Baja un archivo de la API con la sesión del usuario (un enlace normal no manda el token) y lo
 * guarda en el computador, con el nombre que propone el servidor.
 */
export async function descargarArchivo(
  ruta: string,
  params: Record<string, unknown> = {},
  nombrePorDefecto = 'exportacion.csv',
): Promise<ResultadoDescarga> {
  const respuesta = await api.get<Blob>(ruta, { params, responseType: 'blob' });
  const nombre = nombreDe(respuesta.headers['content-disposition'] as string | undefined, nombrePorDefecto);

  const url = URL.createObjectURL(respuesta.data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  const filas = Number(respuesta.headers['x-total-filas']);
  return {
    nombre,
    filas: Number.isFinite(filas) ? filas : null,
    truncado: respuesta.headers['x-exportacion-truncada'] === '1',
  };
}
