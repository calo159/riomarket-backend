import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LayoutGrid, MapPin, Star, Store } from 'lucide-react';
import { listarCategorias, listarProductos, listarPuestos } from '../api/catalog';
import { ProductoCard } from '../components/ProductoCard';
import { PuestoCard } from '../components/PuestoCard';
import { Destacados } from '../components/Destacados';
import { MedallaCategoria } from '../components/iconos';
import { Imagen } from '../components/Imagen';
import { EsqueletoGrid, EstadoError } from '../components/ui/Estado';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';
import { claves } from '../lib/queryKeys';
import { cn, urlAbsoluta } from '../lib/utils';
import type { Categoria, Producto } from '../lib/types';

function nombreCategoria(categorias: Categoria[] | undefined, id: number): string | null {
  return categorias?.find((c) => c.id === id)?.nombre ?? null;
}

/** Fila horizontal de productos con flecha para desplazar. */
function Estante({
  titulo,
  to,
  textoVer,
  productos,
  categorias,
  cargando,
  error,
  alReintentar,
}: {
  titulo: string;
  to: string;
  textoVer: string;
  productos?: Producto[];
  categorias?: Categoria[];
  cargando: boolean;
  error: boolean;
  alReintentar: () => void;
}) {
  const fila = useRef<HTMLDivElement>(null);
  const mover = () => {
    const el = fila.current;
    if (el) el.scrollBy({ left: el.clientWidth * 0.6, behavior: 'smooth' });
  };
  return (
    <section className="mt-6 md:mt-[30px]" aria-label={titulo}>
      <div className="mb-2.5 flex items-baseline gap-3.5 md:mb-3">
        <h2 className="text-xl font-bold tracking-tight md:text-[23px]">{titulo}</h2>
        <Link to={to} className="link text-sm">
          {textoVer}
        </Link>
      </div>
      {cargando && <EsqueletoGrid cantidad={5} />}
      {error && <EstadoError mensaje="No pudimos cargar los productos." onReintentar={alReintentar} />}
      {productos && productos.length === 0 && (
        <div className="card px-6 py-10 text-center text-slate-500 dark:text-slate-400">
          Todavía no hay productos publicados.
        </div>
      )}
      {productos && productos.length > 0 && (
        <div className="relative">
          <div
            ref={fila}
            className="-m-[3px] grid snap-x snap-mandatory auto-cols-[calc((100%-9px)/2)] grid-flow-col gap-[9px] overflow-x-auto scroll-smooth p-[3px] pb-2 [scrollbar-width:none] md:auto-cols-[calc((100%-56px)/5)] md:snap-none md:gap-3.5 [&::-webkit-scrollbar]:hidden"
          >
            {productos.map((producto) => (
              <div key={producto.id} className="snap-start">
                <ProductoCard producto={producto} categoria={nombreCategoria(categorias, producto.id_categoria)} />
              </div>
            ))}
          </div>
          {productos.length > 5 && (
            <button
              type="button"
              onClick={mover}
              aria-label="Ver más productos"
              className="absolute -right-4 top-[40%] z-[2] hidden h-[42px] w-[42px] place-items-center rounded-full bg-white text-brand-600 shadow-[0_2px_9px_rgba(16,44,54,.28)] transition-transform hover:scale-110 md:grid dark:bg-slate-800 dark:text-brand-200"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function Inicio() {
  const { autenticado, rol } = useSession();

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias, staleTime: 5 * 60_000 });
  const productos = useQuery({
    queryKey: claves.productos.inicio,
    queryFn: () => listarProductos({ page_size: 10, ordering: '-id' }),
  });
  const puestos = useQuery({
    queryKey: claves.puestos.inicio,
    queryFn: () => listarPuestos({ page_size: 6, ordering: 'nombre' }),
  });

  // Segundo estante: los productos de la primera categoría que lo permita (frutas si existe).
  const lista = categorias.data ?? [];
  const destacada = lista.find((c) => /^fruta/i.test(c.nombre)) ?? lista[0];
  const deCategoria = useQuery({
    queryKey: claves.productos.catalogo({ categoria: destacada?.id, page_size: 10 }),
    queryFn: () => listarProductos({ categoria: destacada!.id, page_size: 10 }),
    enabled: Boolean(destacada),
  });

  useEffect(() => {
    document.title = 'RioMarket · Mercado de Riohacha';
  }, []);

  const todosPuestos = puestos.data?.results ?? [];
  const promos = [...todosPuestos].sort((a, b) => Number(Boolean(b.portada)) - Number(Boolean(a.portada))).slice(0, 2);
  const visibles = lista.length > 8 ? lista.slice(0, 7) : lista;

  return (
    <div>
      <h1 className="sr-only">RioMarket, el mercado de Riohacha en línea</h1>
      <Destacados puestos={todosPuestos} />

      <div className="mx-auto max-w-[1240px] px-3 pb-1.5 md:px-5">
        <nav
          aria-label="Categorías"
          className="relative z-[4] -mt-9 grid grid-cols-4 gap-0.5 rounded-xl bg-white px-2 py-3 shadow-flota md:grid-cols-8 md:gap-0 md:px-1.5 md:py-3.5 dark:bg-slate-900"
        >
          {categorias.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 py-2.5" aria-hidden="true">
                <div className="skeleton h-12 w-12 rounded-full md:h-14 md:w-14" />
                <div className="skeleton h-3 w-14" />
              </div>
            ))}
          {visibles.map((c) => (
            <Link
              key={c.id}
              to={`/catalogo?categoria=${c.id}`}
              className="group flex min-h-[86px] flex-col items-center gap-1.5 rounded-lg px-1 py-1.5 text-center text-xs font-semibold leading-[1.2] text-tinta transition-colors hover:bg-brand-50 hover:text-brand-600 md:gap-2 md:py-2.5 md:text-[13px] dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-brand-200"
            >
              <MedallaCategoria
                nombre={c.nombre}
                className="h-12 w-12 transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(.2,1.5,.4,1)] group-hover:-translate-y-[3px] group-hover:scale-[1.07] group-active:scale-90 md:h-14 md:w-14"
                iconoClassName="h-[25px] w-[25px] md:h-7 md:w-7"
              />
              {c.nombre}
            </Link>
          ))}
          {lista.length > 8 && (
            <Link
              to="/catalogo"
              className="group flex min-h-[86px] flex-col items-center gap-1.5 rounded-lg px-1 py-1.5 text-center text-xs font-semibold leading-[1.2] text-tinta transition-colors hover:bg-brand-50 hover:text-brand-600 md:gap-2 md:py-2.5 md:text-[13px] dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 transition-transform duration-[220ms] [transition-timing-function:cubic-bezier(.2,1.5,.4,1)] group-hover:-translate-y-[3px] group-hover:scale-[1.07] md:h-14 md:w-14 dark:bg-slate-800 dark:text-brand-200">
                <LayoutGrid className="h-[25px] w-[25px] md:h-7 md:w-7" aria-hidden="true" />
              </span>
              Ver todas
            </Link>
          )}
          {categorias.isError && (
            <p className="col-span-full p-3 text-sm text-slate-500">No pudimos cargar las categorías.</p>
          )}
        </nav>

        <section className="mt-4 hidden grid-cols-3 gap-3.5 md:grid" aria-label="Accesos rápidos">
          {[
            {
              to: '/catalogo',
              titulo: 'Pide a domicilio o recoge en el puesto',
              texto: 'Tú eliges cómo recibirlo en cada pedido.',
              foto: '/landing/arepa-de-huevo.webp',
            },
            {
              to: '#puestos',
              titulo: 'Conoce los puestos de Riohacha',
              texto: 'Vendedores con la identidad verificada.',
              foto: '/landing/aguacate.webp',
            },
            {
              to: autenticado ? inicioPorRol(rol) : '/registro?rol=vendedor',
              titulo: 'Vende en RioMarket',
              texto: 'Abre tu puesto en línea.',
              foto: '/landing/coco.webp',
              destacado: true,
            },
          ].map(({ to, titulo, texto, foto, destacado }) => {
            const clase = cn(
              'card card-hover grid min-h-[116px] grid-cols-[minmax(0,1fr)_38%] overflow-hidden text-tinta hover:text-tinta dark:text-slate-100 dark:hover:text-slate-100',
              destacado && 'border-transparent bg-amarillo dark:bg-amarillo dark:text-tinta dark:hover:text-tinta',
            );
            const contenido = (
              <>
                <span className="flex flex-col justify-center gap-1 p-4">
                  <b className="text-base leading-tight">{titulo}</b>
                  <small className={cn('text-[13px]', destacado ? 'text-[#38505B]' : 'text-slate-500 dark:text-slate-400')}>
                    {texto}
                  </small>
                </span>
                <img
                  src={foto}
                  alt=""
                  width={640}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </>
            );
            return to.startsWith('#') ? (
              <a key={titulo} href={to} className={clase}>
                {contenido}
              </a>
            ) : (
              <Link key={titulo} to={to} className={clase}>
                {contenido}
              </Link>
            );
          })}
        </section>

        <Estante
          titulo="Recién llegados"
          to="/catalogo?ordering=-id"
          textoVer="Ver todos"
          productos={productos.data?.results}
          categorias={categorias.data}
          cargando={productos.isLoading}
          error={productos.isError}
          alReintentar={() => void productos.refetch()}
        />

        {promos.length > 0 && (
          <section className="mt-6 grid gap-3.5 md:mt-[30px] md:grid-cols-2" aria-label="Puestos destacados">
            {promos.map((p, i) => {
              const claro = i === 0;
              const foto = urlAbsoluta(p.portada);
              return (
                <Link
                  key={p.id}
                  to={`/puestos/${p.id}`}
                  className={`grid h-[132px] grid-cols-[minmax(0,1fr)_40%] overflow-hidden rounded-xl transition duration-[180ms] hover:-translate-y-0.5 hover:shadow-hover md:h-[176px] md:grid-cols-[minmax(0,1fr)_44%] ${
                    claro ? 'bg-amarillo text-tinta hover:text-tinta' : 'bg-azul text-white hover:text-white'
                  }`}
                >
                  <div className="flex flex-col justify-center gap-1.5 p-4 md:p-[22px]">
                    <h3 className="line-clamp-2 text-xl font-extrabold leading-[1.1] tracking-tight md:text-2xl">{p.nombre}</h3>
                    {p.descripcion && <p className="line-clamp-2 text-sm md:text-[15px]">{p.descripcion}</p>}
                    <span className="mt-1 self-start rounded-[5px] border-[1.5px] border-dashed border-current px-2 py-[3px] text-sm font-bold">
                      Ver el puesto
                    </span>
                  </div>
                  {foto ? (
                    <Imagen src={foto} fallbackNombre={p.nombre} contenedorClassName="h-full w-full" alt="" />
                  ) : (
                    <div className="grid place-items-center bg-black/10">
                      <Store className="h-12 w-12 opacity-70" aria-hidden="true" />
                    </div>
                  )}
                </Link>
              );
            })}
          </section>
        )}

        <section id="puestos" className="mt-6 scroll-mt-4 md:mt-[30px]" aria-label="Puestos de Riohacha">
          <div className="mb-2.5 flex items-baseline gap-3.5 md:mb-3">
            <h2 className="text-xl font-bold tracking-tight md:text-[23px]">Puestos de Riohacha</h2>
          </div>
          {puestos.isLoading && <EsqueletoGrid cantidad={4} />}
          {puestos.isError && <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />}
          {puestos.data && puestos.data.results.length === 0 && (
            <div className="card px-6 py-10 text-center text-slate-500 dark:text-slate-400">Todavía no hay puestos publicados.</div>
          )}
          {puestos.data && puestos.data.results.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {puestos.data.results.slice(0, 8).map((puesto) => (
                <PuestoCard key={puesto.id} puesto={puesto} />
              ))}
            </div>
          )}
        </section>

        {destacada && (
          <Estante
            titulo={destacada.nombre}
            to={`/catalogo?categoria=${destacada.id}`}
            textoVer="Ver todos"
            productos={deCategoria.data?.results}
            categorias={categorias.data}
            cargando={deCategoria.isLoading}
            error={deCategoria.isError}
            alReintentar={() => void deCategoria.refetch()}
          />
        )}
      </div>

      <section className="mt-9 bg-white dark:bg-slate-900" aria-label="Cómo funciona">
        <div className="mx-auto grid max-w-[1240px] gap-5 px-5 py-6 md:grid-cols-3 md:gap-6">
          {[
            { icono: Store, titulo: 'Un pedido por puesto', texto: 'Compras directo a cada vendedor.' },
            { icono: MapPin, titulo: 'Sigue tu pedido', texto: 'Del puesto hasta tus manos, paso a paso.' },
            { icono: Star, titulo: 'Reseñas de compradores', texto: 'Solo opina quien recibió su pedido.' },
          ].map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="flex items-start gap-3">
              <Icono className="h-[30px] w-[30px] shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <b className="block">{titulo}</b>
                <span className="text-sm text-slate-500 dark:text-slate-400">{texto}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
