import { Link } from 'react-router-dom';
import { MapPin, Truck } from 'lucide-react';
import type { Puesto } from '../lib/types';
import { Imagen } from './Imagen';
import { coloresDePuesto, inicialesDe } from './iconos';
import { tonoDe } from './tonoCategoria';
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
  // Sin marco ni avatar encima de la foto: la foto, el nombre y tres líneas (calificación y entrega, dirección, descripción).
  return (
    <Link to={`/puestos/${puesto.id}`} className="group block text-tinta dark:text-slate-100">
      <div className="aspect-[3/2] overflow-hidden rounded-xl bg-brand-50 dark:bg-slate-800">
        {portada ? (
          <Imagen
            src={portada}
            fallbackNombre={puesto.nombre}
            contenedorClassName="h-full w-full"
            className="transition duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <LogoPuesto nombre={puesto.nombre} logo={puesto.logo} className="h-16 w-16 text-2xl" />
          </div>
        )}
      </div>
      <div className="px-0.5 pt-3">
        <h3 className="truncate text-base font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-300">{puesto.nombre}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-600 dark:text-slate-300">
          {puesto.calificacion_promedio ? (
            <span className="font-bold text-estrella dark:text-amber-400">
              ★ {puesto.calificacion_promedio.toFixed(1)}
              {puesto.cantidad_resenas > 0 && <span className="font-normal text-slate-500 dark:text-slate-400"> ({puesto.cantidad_resenas})</span>}
            </span>
          ) : (
            <span>Sin reseñas</span>
          )}
          <span aria-hidden="true">·</span>
          {puesto.ofrece_domicilio ? (
            <span className="inline-flex items-center gap-1 font-semibold text-exito dark:text-[#6FD596]">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Domicilio
            </span>
          ) : (
            <span>Retiro en puesto</span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {puesto.direccion}
        </p>
        {puesto.descripcion && <p className="mt-1.5 line-clamp-1 text-sm text-slate-600 dark:text-slate-300">{puesto.descripcion}</p>}
        {categorias.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
            {categorias.slice(0, 3).map((categoria) => (
              <span key={categoria.id} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tonoDe(categoria.nombre).punto }} />
                {categoria.nombre}
              </span>
            ))}
          </p>
        )}
      </div>
    </Link>
  );
}
