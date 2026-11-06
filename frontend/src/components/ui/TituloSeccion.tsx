import { cn } from '../../lib/utils';

/** Título de sección de la tienda: en la tipografía de rótulo (`.titulo-seccion`, index.css), un solo color y sin adornos. */
export function TituloSeccion({ texto, className }: { texto: string; className?: string }) {
  return <h2 className={cn('titulo-seccion', className)}>{texto}</h2>;
}
