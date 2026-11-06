import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerSitio } from '../api/sitio';
import { claves } from '../lib/queryKeys';
import { aplicarSitio } from '../lib/sitio';

/**
 * Mantiene al día la identidad del sitio (nombre, textos y color de la marca). La primera pantalla ya sale con la
 * correcta porque Django la deja en el HTML; esto la refresca cuando el administrador la cambia.
 */
export function SitioSync() {
  const { data } = useQuery({ queryKey: claves.sitio, queryFn: obtenerSitio, staleTime: 5 * 60_000 });
  useEffect(() => {
    if (data) aplicarSitio(data);
  }, [data]);
  return null;
}
