import { useState } from 'react';
import { ReservaImagen } from './ReservaImagen';

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  miniatura?: string | null;
  fallbackNombre?: string;
  categoriaId?: number | null;
  contenedorClassName?: string;
}

export function Imagen({
  src,
  miniatura,
  fallbackNombre = '',
  categoriaId,
  contenedorClassName = '',
  className = '',
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: Props) {
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(true);
  const url = src || miniatura || null;

  if (!url || error) {
    return (
      <div className={`relative overflow-hidden ${contenedorClassName}`}>
        <ReservaImagen nombre={fallbackNombre} categoriaId={categoriaId} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${contenedorClassName}`}>
      {cargando && <ReservaImagen nombre={fallbackNombre} categoriaId={categoriaId} className="absolute inset-0 h-full w-full" />}
      <img
        {...rest}
        src={url}
        alt={alt}
        loading={loading}
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
