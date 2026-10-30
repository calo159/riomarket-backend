import { clasesDeCategoria } from '../lib/categoria';
import { cn } from '../lib/utils';
import { Reticula } from './Reticula';

/** Sin categoría conocida (logos, portadas): el color sale del nombre, siempre el mismo. */
function nombreAId(nombre: string): number {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return h;
}

/** Sin foto: bloque del color de la categoría con la inicial grande y la retícula abajo. */
export function ReservaImagen({
  nombre,
  categoriaId,
  className = '',
}: {
  nombre: string;
  categoriaId?: number | null;
  className?: string;
}) {
  const clases = clasesDeCategoria(categoriaId ?? nombreAId(nombre));
  const inicial = (nombre || 'R').trim().charAt(0).toUpperCase();
  return (
    <div className={cn('relative flex h-full w-full items-center justify-center overflow-hidden', clases.bloque, className)}>
      <span aria-hidden="true" className="text-5xl font-extrabold leading-none sm:text-6xl">
        {inicial}
      </span>
      <Reticula className={cn('absolute inset-x-0 bottom-0 h-7', clases.ranuras)} />
    </div>
  );
}
