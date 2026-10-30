import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import { listarCategorias, listarProductos, listarPuestos } from '../api/catalog';
import { Reticula } from '../components/Reticula';
import { ProductoCard } from '../components/ProductoCard';
import { PuestoCard } from '../components/PuestoCard';
import { EsqueletoGrid, EstadoError } from '../components/ui/Estado';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';
import { clasesDeCategoria } from '../lib/categoria';
import { claves } from '../lib/queryKeys';
import type { Categoria } from '../lib/types';
import { cn } from '../lib/utils';

const MAX_CATEGORIAS = 12;
/** Anchos relativos que se repiten por fila: así los bloques nunca salen del mismo ancho. */
const PESOS = [5, 3, 4, 3, 6, 4, 3, 5, 4, 3, 5, 4];

interface Fila {
  bloques: Categoria[];
  primera: boolean;
}

/** Reparte las categorías en filas: junto al bloque azul caben dos, el resto va en filas de hasta cinco. */
function repartirEnFilas(categorias: Categoria[]): Fila[] {
  const junto = categorias.slice(0, 2);
  const resto = categorias.slice(2);
  const filas: Fila[] = [{ bloques: junto, primera: true }];
  if (resto.length > 0) {
    const cantidad = Math.ceil(resto.length / 5);
    const base = Math.floor(resto.length / cantidad);
    let sobran = resto.length % cantidad;
    let inicio = 0;
    for (let i = 0; i < cantidad; i += 1) {
      const tamano = base + (sobran > 0 ? 1 : 0);
      sobran -= 1;
      filas.push({ bloques: resto.slice(inicio, inicio + tamano), primera: false });
      inicio += tamano;
    }
  }
  return filas;
}

function Canasta({
  categoria,
  peso,
  className,
}: {
  categoria: Categoria;
  peso: number;
  className?: string;
}) {
  const clases = clasesDeCategoria(categoria.id);
  return (
    <Link
      to={`/catalogo?categoria=${categoria.id}`}
      style={{ '--peso': peso } as CSSProperties}
      className={cn(
        'group relative flex min-h-28 flex-col justify-start overflow-hidden rounded-lg px-4 pb-12 pt-9 lg:min-h-0 lg:flex-[var(--peso)] lg:px-6 lg:pt-10',
        clases.bloque,
        'focus-visible:ring-4 focus-visible:ring-inset',
        clases.foco,
        className,
      )}
    >
      <span className="asa" aria-hidden="true" />
      <span className="text-2xl font-extrabold leading-tight group-hover:underline lg:text-3xl">{categoria.nombre}</span>
      <Reticula className={cn('absolute inset-x-0 bottom-0 h-7 lg:h-14', clases.ranuras)} />
    </Link>
  );
}

function CanastaVacia({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'relative flex min-h-28 flex-col overflow-hidden rounded-lg bg-slate-200 px-4 pb-12 pt-9 text-slate-900 dark:bg-slate-800 dark:text-slate-100 lg:min-h-0 lg:flex-1 lg:px-6 lg:pt-10',
        className,
      )}
    >
      <span className="asa" aria-hidden="true" />
      {children}
      <Reticula className="absolute inset-x-0 bottom-0 h-7 text-slate-950/10 dark:text-white/10 lg:h-14" />
    </div>
  );
}

function BloqueBuscador({
  busqueda,
  setBusqueda,
  buscar,
  className,
}: {
  busqueda: string;
  setBusqueda: (texto: string) => void;
  buscar: (evento: FormEvent) => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'relative flex flex-col justify-center overflow-hidden rounded-lg bg-brand-800 px-4 pb-14 pt-12 text-white dark:bg-brand-700 lg:px-8 lg:pb-20 lg:pt-14',
        className,
      )}
    >
      <span className="asa" aria-hidden="true" />
      <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight lg:text-7xl">¿Qué llevas hoy?</h1>
      <form onSubmit={buscar} className="mt-6 flex max-w-xl gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Buscar en el catálogo</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Frutas, arepas, artesanías"
            className="input h-12 border-white pl-10 text-base dark:border-white"
          />
        </label>
        <button type="submit" className="btn-sol h-12 px-5">
          Buscar
        </button>
      </form>
      <Link
        to="/catalogo"
        className="mt-4 inline-flex items-center gap-1.5 self-start font-semibold underline underline-offset-4 focus-visible:ring-white focus-visible:ring-offset-brand-800"
      >
        Ver todo el catálogo <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <Reticula className="absolute inset-x-0 bottom-0 h-7 text-slate-950/25 lg:h-14" />
    </section>
  );
}

export function Inicio() {
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();
  const { autenticado, rol } = useSession();

  useEffect(() => {
    document.title = 'RioMarket · Mercado de Riohacha';
  }, []);

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias, staleTime: 5 * 60_000 });
  const productos = useQuery({
    queryKey: claves.productos.inicio,
    queryFn: () => listarProductos({ page_size: 10, ordering: '-id' }),
  });
  const puestos = useQuery({
    queryKey: claves.puestos.inicio,
    queryFn: () => listarPuestos({ page_size: 6, ordering: 'nombre' }),
  });

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    navigate(busqueda.trim() ? `/catalogo?q=${encodeURIComponent(busqueda.trim())}` : '/catalogo');
  };

  const lista = (categorias.data ?? []).slice(0, MAX_CATEGORIAS);
  const filas = repartirEnFilas(lista);
  const huerfanoMovil = lista.length % 2 === 1;
  const columnasMd = lista.length % 3;

  return (
    <div>
      <div className="grid grid-cols-2 gap-[3px] bg-white p-[3px] dark:bg-slate-950 md:grid-cols-3 lg:flex lg:h-[calc(100svh-4rem)] lg:min-h-[34rem] lg:flex-col">
        {/* En celular y tablet las filas se aplanan: el bloque azul va primero y luego las canastas. */}
        {filas.map((fila, indiceFila) => (
          <div
            key={indiceFila}
            className={cn(
              'contents lg:flex lg:gap-[3px]',
              fila.primera ? 'lg:flex-[1.7]' : 'lg:flex-1',
            )}
          >
            {fila.primera && (
              <BloqueBuscador
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                buscar={buscar}
                className="col-span-full lg:flex-[7]"
              />
            )}
            {fila.bloques.map((categoria) => {
              const posicion = lista.indexOf(categoria);
              const esUltima = posicion === lista.length - 1;
              return (
                <Canasta
                  key={categoria.id}
                  categoria={categoria}
                  peso={PESOS[(posicion + indiceFila) % PESOS.length]}
                  className={cn(
                    esUltima && huerfanoMovil && 'col-span-2',
                    esUltima && (columnasMd === 1 ? 'md:col-span-3' : columnasMd === 2 ? 'md:col-span-2' : 'md:col-span-1'),
                  )}
                />
              );
            })}
          </div>
        ))}

        {categorias.isLoading && (
          <div className="contents lg:flex lg:flex-1 lg:gap-[3px]" aria-hidden="true">
            {[0, 1, 2, 3].map((n) => (
              <CanastaVacia key={n} className={n === 3 ? 'col-span-2 md:col-span-1' : undefined} />
            ))}
          </div>
        )}
        {categorias.isError && (
          <div className="contents lg:flex lg:flex-1 lg:gap-[3px]">
            <CanastaVacia className="col-span-full">
              <p className="text-xl font-extrabold">No pudimos cargar las categorías</p>
              <button type="button" className="btn-secondary mt-3 self-start" onClick={() => void categorias.refetch()}>
                Reintentar
              </button>
            </CanastaVacia>
          </div>
        )}
        {categorias.isSuccess && lista.length === 0 && (
          <div className="contents lg:flex lg:flex-1 lg:gap-[3px]">
            <CanastaVacia className="col-span-full">
              <p className="text-xl font-extrabold">Todavía no hay categorías</p>
              <p className="mt-1">Cuando los puestos publiquen, las canastas aparecerán aquí.</p>
            </CanastaVacia>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl">Recién llegados</h2>
          <Link to="/catalogo?ordering=-id" className="link text-sm">
            Ver más
          </Link>
        </div>
        {productos.isLoading && <EsqueletoGrid cantidad={10} />}
        {productos.isError && <EstadoError mensaje="No pudimos cargar los productos." onReintentar={() => void productos.refetch()} />}
        {productos.data && productos.data.results.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-slate-300 px-5 py-8 text-slate-700 dark:border-slate-600 dark:text-slate-300">
            Todavía no hay productos publicados.
          </p>
        )}
        {productos.data && productos.data.results.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productos.data.results.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl">Puestos de Riohacha</h2>
          <Link to="/catalogo" className="link text-sm">
            Ver catálogo
          </Link>
        </div>
        {puestos.isLoading && (
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((n) => (
              <div key={n}>
                <div className="skeleton h-24 w-full rounded-lg" />
                <div className="skeleton mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
        )}
        {puestos.isError && <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />}
        {puestos.data && puestos.data.results.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-slate-300 px-5 py-8 text-slate-700 dark:border-slate-600 dark:text-slate-300">
            Todavía no hay puestos activos.
          </p>
        )}
        {puestos.data && puestos.data.results.length > 0 && (
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {puestos.data.results.map((puesto) => (
              <PuestoCard key={puesto.id} puesto={puesto} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-lg bg-sol-400 px-6 pb-16 pt-12 text-slate-950 sm:flex-row sm:items-center sm:px-8">
          <span className="asa" aria-hidden="true" />
          <div>
            <h2 className="text-2xl sm:text-3xl">¿Tienes un puesto en Riohacha?</h2>
            <p className="mt-2 max-w-xl">
              Verifica tu identidad, publica tus productos y recibe pedidos de tus vecinos.
            </p>
          </div>
          <Link
            to={autenticado ? inicioPorRol(rol) : '/registro?rol=vendedor'}
            className="btn shrink-0 bg-slate-950 text-white hover:bg-slate-800 focus-visible:ring-slate-950 focus-visible:ring-offset-sol-400"
          >
            {autenticado ? 'Ir a mi panel' : 'Quiero vender'} <ArrowRight className="h-4 w-4" />
          </Link>
          <Reticula className="absolute inset-x-0 bottom-0 h-7 text-slate-950/20" />
        </div>
      </section>
    </div>
  );
}
