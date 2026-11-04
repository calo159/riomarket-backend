import { useState } from 'react';
import { Download } from 'lucide-react';
import { descargarArchivo } from '../../lib/descargas';
import { mensajeDeError } from '../../lib/errors';
import { useToast } from '../ui/Toast';

/**
 * Descarga en CSV lo que muestra la lista, con los mismos filtros. El archivo lo arma el servidor
 * (neutraliza fórmulas y respeta quién puede ver qué).
 */
export function BotonExportar({
  ruta,
  params = {},
  nombre,
  etiqueta = 'Exportar CSV',
}: {
  ruta: string;
  params?: Record<string, unknown>;
  /** Nombre de respaldo del archivo si el servidor no propone uno. */
  nombre: string;
  etiqueta?: string;
}) {
  const toast = useToast();
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    setDescargando(true);
    try {
      const resultado = await descargarArchivo(ruta, params, nombre);
      if (resultado.truncado) {
        toast.info(`Descargamos las primeras ${resultado.filas ?? ''} filas: hay más. Afina los filtros para el resto.`);
      } else {
        toast.exito(resultado.filas === null ? 'Descargamos el archivo.' : `Descargamos ${resultado.filas} filas.`);
      }
    } catch (fallo) {
      toast.error(mensajeDeError(fallo, 'No pudimos exportar. Intenta de nuevo.'));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <button type="button" className="btn-secondary" onClick={() => void descargar()} disabled={descargando}>
      <Download className="h-4 w-4" aria-hidden="true" /> {descargando ? 'Exportando…' : etiqueta}
    </button>
  );
}
