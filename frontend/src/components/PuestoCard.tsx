import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Puesto } from '../lib/types';
import { clasesDeCategoria } from '../lib/categoria';
import { formatearCalificacion } from '../lib/format';
import { cn } from '../lib/utils';
import { Reticula } from './Reticula';

/** Categoría que da color al letrero de un puesto: la primera que vende. */
export function categoriaPrincipalDe(puesto: Puesto): number | null {
  const categorias = puesto.categorias as unknown as { id: number }[] | undefined;
  return categorias?.[0]?.id ?? null;
}

/** Letrero compacto: el nombre del puesto sobre un bloque del color de su categoría. */
export function PuestoCard({ puesto }: { puesto: Puesto }) {
  const categorias = puesto.categorias as unknown as { id: number; nombre: string }[];
  const clases = clasesDeCategoria(categoriaPrincipalDe(puesto) ?? puesto.id);
  return (
    <Link to={`/puestos/${puesto.id}`} className="group block">
      <div className={cn('relative overflow-hidden rounded-lg px-4 pb-10 pt-9', clases.bloque)}>
        <span className="asa" aria-hidden="true" />
        <h3 className="line-clamp-2 text-xl font-extrabold leading-tight group-hover:underline">{puesto.nombre}</h3>
        <Reticula className={cn('absolute inset-x-0 bottom-0 h-7', clases.ranuras)} />
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-slate-700 dark:text-slate-300">{puesto.direccion}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-600 dark:text-slate-400">
        <span className="tnum inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-sol-400 text-sol-600" aria-hidden="true" />
          {formatearCalificacion(puesto.calificacion_promedio)}
          {puesto.cantidad_resenas > 0 && ` (${puesto.cantidad_resenas})`}
        </span>
        <span>{puesto.ofrece_domicilio ? 'Domicilio' : 'Solo retiro'}</span>
        {categorias.length > 0 && <span className="line-clamp-1">{categorias.slice(0, 2).map((c) => c.nombre).join(', ')}</span>}
      </p>
    </Link>
  );
}
