import { Link } from 'react-router-dom';
import { MapPin, Truck } from 'lucide-react';
import type { Puesto } from '../lib/types';
import { Imagen } from './Imagen';
import { coloresDePuesto, inicialesDe } from './iconos';
import { urlAbsoluta } from '../lib/utils';

/** Logo redondo del puesto: su foto, o las iniciales sobre un color propio. */
export function LogoPuesto({
  nombre,
  logo,
  className = 'h-[54px] w-[54px] text-[19px]',
}: {
  nombre: string;
  logo?: string | null;
  className?: string;
}) {
  const url = urlAbsoluta(logo);
  if (url) {
    return (
      <Imagen
        src={url}
        fallbackNombre={nombre}
        contenedorClassName={`shrink-0 rounded-full border-[3px] border-white bg-white dark:border-slate-900 ${className}`}
        alt={`Logo de ${nombre}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border-[3px] border-white font-extrabold text-white dark:border-slate-900 ${className}`}
      style={{ background: coloresDePuesto(nombre) }}
    >
      {inicialesDe(nombre)}
    </span>
  );
}

export function PuestoCard({ puesto }: { puesto: Puesto }) {
  const categorias = puesto.categorias as unknown as { id: number; nombre: string }[];
  const portada = urlAbsoluta(puesto.portada);
  return (
    <Link
      to={`/puestos/${puesto.id}`}
      className="card card-hover group flex flex-col overflow-hidden text-tinta dark:text-slate-100"
    >
      <div className="h-[92px] overflow-hidden bg-brand-50 dark:bg-slate-800">
        {portada && (
          <Imagen
            src={portada}
            fallbackNombre={puesto.nombre}
            contenedorClassName="h-full w-full"
            className="transition duration-[400ms] group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pb-3.5">
        <LogoPuesto nombre={puesto.nombre} logo={puesto.logo} className="-mt-[27px] h-[54px] w-[54px] text-[19px]" />
        <h3 className="mt-1.5 truncate text-base font-bold group-hover:text-brand-600 dark:group-hover:text-brand-300">
          {puesto.nombre}
        </h3>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
          {puesto.calificacion_promedio ? (
            <span className="font-bold text-estrella dark:text-amber-400">★ {puesto.calificacion_promedio.toFixed(1)}</span>
          ) : (
            <span>Sin reseñas</span>
          )}
          {puesto.cantidad_resenas > 0 && ` (${puesto.cantidad_resenas})`}
          {' · '}
          {puesto.ofrece_domicilio ? (
            <span className="inline-flex items-center gap-1 font-semibold text-exito dark:text-[#6FD596]">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Domicilio
            </span>
          ) : (
            'Retiro en puesto'
          )}
        </p>
        <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {puesto.direccion}
        </p>
        {puesto.descripcion && (
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{puesto.descripcion}</p>
        )}
        {categorias.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {categorias.slice(0, 3).map((categoria) => (
              <span key={categoria.id} className="badge bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                {categoria.nombre}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
