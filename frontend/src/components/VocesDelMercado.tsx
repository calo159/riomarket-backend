import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listarResenas } from '../api/reviews';
import { claves } from '../lib/queryKeys';
import { lugar, Revela } from './Revela';
import { Estrellas } from './ui/Estrellas';
import { TituloSeccion } from './ui/TituloSeccion';
import type { Puesto, Resena } from '../lib/types';

/** Las reseñas que valen la pena citar: bien calificadas y con algo escrito, una por puesto para que no hable siempre el mismo. */
export function seleccionarCitas(resenas: Resena[], maximo = 3): Resena[] {
  const vistos = new Set<number>();
  const citas: Resena[] = [];
  for (const r of resenas) {
    const texto = (r.comentario ?? '').trim();
    if (r.calificacion < 4 || texto.length < 25 || vistos.has(r.id_puesto)) continue;
    vistos.add(r.id_puesto);
    citas.push(r);
    if (citas.length === maximo) break;
  }
  // La más larga es la que vale la pena poner en grande.
  return citas.sort((a, b) => (b.comentario ?? '').trim().length - (a.comentario ?? '').trim().length);
}

function Firma({ resena, puesto }: { resena: Resena; puesto?: Puesto }) {
  // Solo el nombre de pila: es lo que se dice en un mercado.
  const nombre = resena.usuario_nombre.trim().split(/\s+/)[0];
  return (
    <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
      <Estrellas valor={resena.calificacion} tamano="h-3.5 w-3.5" etiqueta={`${resena.calificacion} de 5`} />
      <span>
        {nombre}
        {puesto && (
          <>
            , sobre{' '}
            <Link to={`/puestos/${puesto.id}`} className="font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-200">
              {puesto.nombre}
            </Link>
          </>
        )}
      </span>
    </figcaption>
  );
}

/**
 * Lo que dicen los compradores: reseñas reales de pedidos entregados, citadas tal cual. La primera va grande, en la
 * tipografía de rótulo, y las otras al lado, más chicas. No se inventa nada: si no hay al menos dos reseñas con
 * comentario, la sección no aparece.
 */
export function VocesDelMercado({ puestos }: { puestos: Puesto[] }) {
  const resenas = useQuery({
    queryKey: claves.resenas.inicio,
    queryFn: () => listarResenas({ calificacion_min: 4, ordering: '-fecha_creacion', page_size: 24 }),
    staleTime: 5 * 60_000,
  });
  const citas = seleccionarCitas(resenas.data?.results ?? []);
  if (citas.length < 2) return null;
  const [grande, ...otras] = citas;
  const puestoDe = (r: Resena) => puestos.find((p) => p.id === r.id_puesto);

  return (
    <Revela as="section" aria-label="Lo que dicen los compradores" className="mx-auto mt-16 max-w-[1240px] px-3 md:mt-24 md:px-5">
      <div className="rv mb-7">
        <TituloSeccion texto="Lo que dicen de los puestos" />
      </div>
      <div className="grid gap-10 md:grid-cols-[1.35fr_1fr] md:gap-16">
        <figure className="rv" style={lugar(1)}>
          <blockquote className="font-display text-[26px] font-normal leading-[1.22] [font-synthesis:none] [text-wrap:pretty] md:text-[36px]">
            «{grande.comentario?.trim()}»
          </blockquote>
          <Firma resena={grande} puesto={puestoDe(grande)} />
        </figure>
        <div className="flex flex-col gap-8 md:border-l md:border-slate-300 md:pl-10 dark:md:border-slate-700">
          {otras.map((r, i) => (
            <figure key={r.id} className="rv" style={lugar(i + 2)}>
              <blockquote className="text-[17px] leading-snug text-slate-800 [text-wrap:pretty] dark:text-slate-100">
                «{r.comentario?.trim()}»
              </blockquote>
              <Firma resena={r} puesto={puestoDe(r)} />
            </figure>
          ))}
        </div>
      </div>
    </Revela>
  );
}
