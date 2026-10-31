import { useState } from 'react';
import { ReservaImagen } from './ReservaImagen';

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  miniatura?: string | null;
  fallbackNombre?: string;
  categoria?: string | null;
  contenedorClassName?: string;
  /**
   * Foto que el usuario ve al abrir la página (candidata a LCP): se pide ya y con prioridad alta.
   * El resto se carga de forma diferida.
   */
  prioridad?: boolean;
}

export function Imagen({
  src,
  miniatura,
  fallbackNombre = '',
  categoria,
  contenedorClassName = '',
  className = '',
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  prioridad = false,
  ...rest
}: Props) {
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(true);
  const url = src || miniatura || null;

  if (!url || error) {
    return (
      <div className={`relative overflow-hidden ${contenedorClassName}`}>
        <ReservaImagen nombre={fallbackNombre} categoria={categoria} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${contenedorClassName}`}>
      {cargando && <ReservaImagen nombre={fallbackNombre} categoria={categoria} className="absolute inset-0 h-full w-full" />}
      <img
        {...rest}
        // `fetchpriority` en minúsculas: React 18 aún no conoce `fetchPriority` y avisa en consola.
        {...(prioridad ? { fetchpriority: 'high' } : {})}
        src={url}
        alt={alt}
        loading={prioridad ? 'eager' : loading}
        decoding={decoding}
        className={`h-full w-full object-cover ${className}`}
        onLoad={() => setCargando(false)}
        onError={() => {
          setError(true);
          setCargando(false);
        }}
      />
    </div>
  );
}
