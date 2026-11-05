import { cn } from '../../lib/utils';

/**
 * Título de sección de la tienda: grande, en peso 900 y con la última palabra resaltada, como los de
 * la landing («Recién **llegados**»). `claro` es para las bandas de color (texto blanco, resalte amarillo).
 * El resalte es un `<span>`, no un `<em>`: es color, no énfasis para quien usa lector de pantalla.
 */
export function TituloSeccion({
  texto,
  claro = false,
  className,
}: {
  texto: string;
  claro?: boolean;
  className?: string;
}) {
  const palabras = texto.trim().split(/\s+/);
  const ultima = palabras.length > 1 ? palabras.pop() : null;
  return (
    <h2 className={cn('titulo-seccion', claro && 'titulo-seccion-claro', className)}>
      {ultima ? (
        <>
          {palabras.join(' ')} <span className="resalta">{ultima}</span>
        </>
      ) : (
        texto
      )}
    </h2>
  );
}
