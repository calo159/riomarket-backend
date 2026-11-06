import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerSitio } from '../api/sitio';
import { claves } from '../lib/queryKeys';
import { aplicarSitio, identidadEnElHtml, sitioActual } from '../lib/sitio';

/**
 * Mantiene al día la identidad del sitio (nombre, textos y color de la marca). La primera pantalla ya sale con la
 * correcta porque Django la deja en el HTML; esto la refresca cuando el administrador la cambia.
 */
export function SitioSync() {
  // Si Django dejó la identidad en el HTML se parte de ella como dato fresco: no hay petición al cargar la página.
  // Con `npm run dev` (sin Django) no hay nada en el HTML y se pide como antes.
  const { data } = useQuery({
    queryKey: claves.sitio,
    queryFn: obtenerSitio,
    staleTime: 5 * 60_000,
    initialData: identidadEnElHtml ? sitioActual() : undefined,
  });
  useEffect(() => {
    if (data) aplicarSitio(data);
  }, [data]);
  return null;
}
