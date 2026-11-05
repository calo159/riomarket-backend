import { lugar, Revela } from '../components/Revela';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { ProductoCard } from '../components/ProductoCard';
import { PuestoCard } from '../components/PuestoCard';
import { Escaparate } from '../components/Escaparate';
import { AvisoUnPuesto } from '../components/ui/AvisoUnPuesto';
import { MedallaCategoria } from '../components/iconos';
import { TituloSeccion } from '../components/ui/TituloSeccion';
import { EsqueletoGrid, EstadoError } from '../components/ui/Estado';
import { useSession } from '../auth/SessionProvider';
import {
  categoriaDestacada,
  consultaCategorias,
  consultaProductosDeCategoria,
  consultaProductosInicio,
  consultaPuestosInicio,
} from '../api/consultas';
import { cn } from '../lib/utils';
import { claves } from '../lib/queryKeys';
import { listarPedidos } from '../api/orders';
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
    <Revela as="section" className="mt-6 md:mt-[30px]" aria-label={titulo}>
      <div className="rv mb-4 flex items-end justify-between gap-4 md:mb-5">
        <TituloSeccion texto={titulo} />
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-200 dark:hover:text-brand-100"
        >
          {textoVer}
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
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
            {productos.map((producto, i) => (
              <div key={producto.id} className="rv snap-start" style={lugar(i + 1)}>
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
    </Revela>
  );
}

export function Inicio() {
  const { autenticado, rol } = useSession();

  // Las definiciones viven en api/consultas para que api/precarga use las mismas claves.
  const categorias = useQuery(consultaCategorias);
  const productos = useQuery(consultaProductosInicio);
  const puestos = useQuery(consultaPuestosInicio);
  // El «ticket» del primer pliegue: el pedido sin terminar del comprador, si lo hay.
  const pedidoActivo = useQuery({
    queryKey: claves.pedidos.activoDelComprador,
    queryFn: () => listarPedidos({ abiertos: true, page_size: 1 }),
    enabled: autenticado && rol === 'comprador',
    staleTime: 30_000,
  });

  // Segundo estante: los productos de la primera categoría que lo permita (frutas si existe).
  const lista = categorias.data ?? [];
  const destacada = categoriaDestacada(categorias.data);
  const deCategoria = useQuery({
    ...consultaProductosDeCategoria(destacada?.id ?? 0),
    enabled: Boolean(destacada),
  });

  useEffect(() => {
    document.title = 'RioMarket · Mercado de Riohacha';
  }, []);

  const todosPuestos = puestos.data?.results ?? [];
  const visibles = lista.length > 8 ? lista.slice(0, 7) : lista;

  return (
    <div>
      <Escaparate puestos={todosPuestos} pedido={pedidoActivo.data?.results[0] ?? null} />

      <div className="mx-auto max-w-[1240px] px-3 pb-1.5 md:px-5">
        {/* Fila de categorías limpia, como la de Airbnb: la foto del producto típico en un círculo y su nombre. Sin caja
            ni colores vivos: el color lo ponen las fotos. */}
        <nav
          aria-label="Categorías"
          className="entra-medallas relative mt-7 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] md:mt-9 md:grid md:grid-cols-8 md:gap-0 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {categorias.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex w-[88px] shrink-0 flex-col items-center gap-2.5 md:w-auto" aria-hidden="true">
                <div className="skeleton h-16 w-16 rounded-full md:h-[68px] md:w-[68px]" />
                <div className="skeleton h-3 w-14" />
              </div>
            ))}
          {visibles.map((c, i) => (
            <Link
              key={c.id}
              style={lugar(i)}
              to={`/catalogo?categoria=${c.id}`}
              className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 rounded-lg px-1 py-1 text-center text-[13px] font-semibold leading-[1.2] text-slate-700 transition-colors hover:text-brand-700 md:w-auto dark:text-slate-200 dark:hover:text-brand-200"
            >
              <MedallaCategoria
                nombre={c.nombre}
                className="h-16 w-16 transition duration-300 ease-out group-hover:scale-105 group-hover:shadow-flota md:h-[68px] md:w-[68px]"
                iconoClassName="h-7 w-7"
              />
              <span className="border-b-2 border-transparent pb-0.5 transition-colors group-hover:border-brand-600 dark:group-hover:border-brand-300">
                {c.nombre}
              </span>
            </Link>
          ))}
          {lista.length > 8 && (
            <Link
              to="/catalogo"
              style={lugar(visibles.length)}
              className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 rounded-lg px-1 py-1 text-center text-[13px] font-semibold leading-[1.2] text-slate-700 transition-colors hover:text-brand-700 md:w-auto dark:text-slate-200 dark:hover:text-brand-200"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-700 transition duration-300 ease-out group-hover:scale-105 md:h-[68px] md:w-[68px] dark:bg-slate-800 dark:text-brand-200">
                <LayoutGrid className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="border-b-2 border-transparent pb-0.5 transition-colors group-hover:border-brand-600 dark:group-hover:border-brand-300">
                Ver todas
              </span>
            </Link>
          )}
          {categorias.isError && (
            <p className="col-span-full p-3 text-sm text-slate-500">No pudimos cargar las categorías.</p>
          )}
        </nav>

        <AvisoUnPuesto className="mt-4" />

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

      </div>

      {/* Sección de puestos sobre blanco, de ancho completo: separa el ritmo de la página sin competir con las fotos. */}
      <Revela
        as="section"
        id="puestos"
        className="mt-12 scroll-mt-4 md:mt-16"
        aria-label="Puestos de Riohacha"
      >
        <div className="mx-auto max-w-[1240px] px-3 md:px-5">
          <div className="rv mb-4 md:mb-5">
            <TituloSeccion texto="Puestos de Riohacha" />
          </div>
          {puestos.isLoading && <EsqueletoGrid cantidad={4} />}
          {puestos.isError && <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />}
          {puestos.data && puestos.data.results.length === 0 && (
            <div className="card px-6 py-10 text-center text-slate-500 dark:text-slate-400">Todavía no hay puestos publicados.</div>
          )}
          {puestos.data && puestos.data.results.length > 0 && (
            <div
              className={cn(
                'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
                // Con 6 o menos puestos, tres columnas: 4 arriba y 2 abajo dejaba un hueco vacío.
                puestos.data.results.length > 6 && 'xl:grid-cols-4',
              )}
            >
              {puestos.data.results.slice(0, 8).map((puesto, i) => (
                <div key={puesto.id} className="rv [&>*]:h-full" style={lugar(i % 4)}>
                  <PuestoCard puesto={puesto} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Revela>

      {destacada && (
        <div className="mx-auto max-w-[1240px] px-3 md:px-5">
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
        </div>
      )}

      <Revela as="section" bloque className="mx-auto mt-14 max-w-[1240px] px-5 text-center md:mt-20" aria-label="Cómo funciona">
        <p className="mx-auto max-w-2xl text-balance text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          Cada pedido es de un solo puesto, lo sigues paso a paso desde el puesto hasta tus manos, y solo opina quien recibió su pedido.
        </p>
      </Revela>
    </div>
  );
}
