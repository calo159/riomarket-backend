import { Link } from 'react-router-dom';
import { Bike, MapPin, Star, Store } from 'lucide-react';
import type { Puesto } from '../lib/types';
import { Imagen } from './Imagen';
import { urlAbsoluta } from '../lib/utils';

export function PuestoCard({ puesto }: { puesto: Puesto }) {
  const categorias = puesto.categorias as unknown as { id: number; nombre: string }[];
  const logo = urlAbsoluta(puesto.logo);
  const portada = urlAbsoluta(puesto.portada);
  return (
    <Link
      to={`/puestos/${puesto.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      {portada && (
        <div className="relative h-28 w-full">
          <Imagen
            src={portada}
            fallbackNombre={puesto.nombre}
            width={400}
            height={112}
            contenedorClassName="h-full w-full"
          />
        </div>
      )}
      <div className="flex items-start gap-3 p-5">
        {logo ? (
          <Imagen
            src={logo}
            fallbackNombre={puesto.nombre}
            width={48}
            height={48}
            contenedorClassName="h-12 w-12 shrink-0 rounded-xl"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <Store className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:underline">{puesto.nombre}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {puesto.direccion}
          </p>
        </div>
      </div>
      {puesto.descripcion && (
        <p className="mt-3 line-clamp-2 px-5 text-sm text-slate-600 dark:text-slate-300">{puesto.descripcion}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5 px-5">
        {categorias.slice(0, 3).map((categoria) => (
          <span key={categoria.id} className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {categoria.nombre}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t px-5 pb-5 pt-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {puesto.calificacion_promedio ? puesto.calificacion_promedio.toFixed(1) : 'Sin reseñas'}
          {puesto.cantidad_resenas > 0 && ` (${puesto.cantidad_resenas})`}
        </span>
        {puesto.ofrece_domicilio ? (
          <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300">
            <Bike className="h-3.5 w-3.5" /> Domicilio
          </span>
        ) : (
          <span>Solo retiro</span>
        )}
      </div>
    </Link>
  );
}
