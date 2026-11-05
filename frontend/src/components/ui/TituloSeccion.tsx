import { cn } from '../../lib/utils';

/** Título de sección de la tienda: un solo color y peso firme (la escala está en `.titulo-seccion`, index.css). */
export function TituloSeccion({ texto, className }: { texto: string; className?: string }) {
  return <h2 className={cn('titulo-seccion', className)}>{texto}</h2>;
}
