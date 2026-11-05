import { lugar, Revela } from '../components/Revela';
import { cartulinaDe } from '../components/cartulina';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LayoutGrid, MapPin, Star, Store } from 'lucide-react';
import { ProductoCard } from '../components/ProductoCard';
import { PuestoCard } from '../components/PuestoCard';
import { Destacados, puestosDelCarrusel } from '../components/Destacados';
import { AvisoUnPuesto } from '../components/ui/AvisoUnPuesto';
import { MedallaCategoria } from '../components/iconos';
import { Imagen } from '../components/Imagen';
import { desvanecerEnMancha, PatronOlas } from '../components/ui/Decoracion';
import { TituloSeccion } from '../components/ui/TituloSeccion';
import { EsqueletoGrid, EstadoError } from '../components/ui/Estado';
import { useSession } from '../auth/SessionProvider';
import { inicioPorRol } from '../auth/permisos';
import {
  categoriaDestacada,
  consultaCategorias,
  consultaProductosDeCategoria,
  consultaProductosInicio,
  consultaPuestosInicio,
} from '../api/consultas';
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
    <Revela as="section" className="mt-6 md:mt-[30px]" aria-label={titulo}>
      <div className="rv mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 md:mb-4">
        <TituloSeccion texto={titulo} />
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
  // Los dos destacados de abajo son OTROS puestos: los del carrusel ya se vieron arriba (antes se repetían).
  const enCarrusel = new Set(puestosDelCarrusel(todosPuestos).map((p) => p.id));
  const promos = todosPuestos
    .filter((p) => !enCarrusel.has(p.id))
    .sort((a, b) => Number(Boolean(b.portada)) - Number(Boolean(a.portada)))
    .slice(0, 2);
  const visibles = lista.length > 8 ? lista.slice(0, 7) : lista;

  return (
    <div>
      <h1 className="sr-only">RioMarket, el mercado de Riohacha en línea</h1>
      <Destacados puestos={todosPuestos} />

      <div className="mx-auto max-w-[1240px] px-3 pb-1.5 md:px-5">
        {/* Las categorías son cartulinas de colores, una por categoría (components/cartulina.ts), con la foto del producto
            típico asomando. Reemplazan la caja blanca con círculos, que era lo más genérico de la página. */}
        <nav
          aria-label="Categorías"
          className="entra-medallas relative z-[4] -mt-9 flex snap-x gap-2 overflow-x-auto px-0.5 pb-3 pt-1.5 [scrollbar-width:none] md:grid md:grid-cols-8 md:gap-2.5 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {categorias.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-[88px] w-[132px] shrink-0 md:w-auto" aria-hidden="true" />
            ))}
          {visibles.map((c, i) => {
            const cartulina = cartulinaDe(c.nombre);
            return (
              <Link
                key={c.id}
                to={`/catalogo?categoria=${c.id}`}
                style={{ ...lugar(i), background: cartulina.fondo, color: cartulina.tinta, '--giro': `${i % 2 ? 1.2 : -1.2}deg` } as CSSProperties}
                className="group relative flex h-[88px] w-[132px] shrink-0 snap-start items-end overflow-hidden rounded-lg p-2.5 text-[13px] font-extrabold leading-[1.15] shadow-flota transition-transform duration-200 [transform:rotate(var(--giro))] hover:[transform:rotate(0deg)_translateY(-3px)] active:scale-95 md:w-auto md:text-sm"
              >
                <MedallaCategoria
                  nombre={c.nombre}
                  className="absolute right-2 top-2 h-10 w-10 ring-2 ring-white/80 transition-transform duration-200 group-hover:scale-110"
                  iconoClassName="h-5 w-5"
                />
                <span className="relative z-[1]">{c.nombre}</span>
              </Link>
            );
          })}
          {lista.length > 8 && (
            <Link
              to="/catalogo"
              style={lugar(visibles.length)}
              className="group relative flex h-[88px] w-[132px] shrink-0 snap-start items-end overflow-hidden rounded-lg bg-white p-2.5 text-[13px] font-extrabold leading-[1.15] text-tinta shadow-flota transition-transform duration-200 hover:-translate-y-[3px] md:w-auto md:text-sm dark:bg-slate-800 dark:text-slate-100"
            >
              <LayoutGrid className="absolute right-3 top-3 h-6 w-6 text-brand-600 dark:text-brand-300" aria-hidden="true" />
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
              destacado && 'border-transparent bg-amarillo dark:bg-[#C99A2E] dark:text-tinta dark:hover:text-tinta',
            );
            const contenido = (
              <>
                <span className="flex flex-col justify-center gap-1 p-4">
                  <b className="text-base leading-tight">{titulo}</b>
                  <small className={cn('text-[13px]', destacado ? 'text-tinta/85' : 'text-slate-500 dark:text-slate-400')}>
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

        {promos.length > 0 && (
          <Revela as="section" bloque className="mt-6 grid gap-3.5 md:mt-[30px] md:grid-cols-2" aria-label="Puestos destacados">
            {promos.map((p, i) => {
              const claro = i === 0;
              const foto = urlAbsoluta(p.portada);
              return (
                <Link
                  key={p.id}
                  to={`/puestos/${p.id}`}
                  className={`grid h-[132px] grid-cols-[minmax(0,1fr)_40%] overflow-hidden rounded-xl transition duration-[180ms] hover:-translate-y-0.5 hover:shadow-hover md:h-[176px] md:grid-cols-[minmax(0,1fr)_44%] ${
                    claro ? 'bg-amarillo text-tinta hover:text-tinta dark:bg-[#C99A2E]' : 'bg-brand-600 text-white hover:text-white dark:bg-brand-800'
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
          </Revela>
        )}

      </div>

      {/* Banda turquesa de ancho completo: la tienda deja de ser un solo plano y el color vuelve a aparecer al bajar. */}
      <Revela
        as="section"
        id="puestos"
        className="relative mt-9 scroll-mt-4 overflow-hidden bg-brand-600 text-white dark:bg-brand-700 md:mt-12"
        aria-label="Puestos de Riohacha"
      >
        <PatronOlas className="text-white opacity-[.07]" style={desvanecerEnMancha('100% 0%', 55, 140)} />
        <div className="relative mx-auto max-w-[1240px] px-3 py-8 md:px-5 md:py-11">
          <div className="rv mb-4 flex items-baseline gap-3.5 md:mb-5">
            <TituloSeccion texto="Puestos de Riohacha" claro />
          </div>
          {puestos.isLoading && <EsqueletoGrid cantidad={4} />}
          {puestos.isError && <EstadoError mensaje="No pudimos cargar los puestos." onReintentar={() => void puestos.refetch()} />}
          {puestos.data && puestos.data.results.length === 0 && (
            <div className="card px-6 py-10 text-center text-slate-500 dark:text-slate-400">Todavía no hay puestos publicados.</div>
          )}
          {puestos.data && puestos.data.results.length > 0 && (
            <div
              className={cn(
                'grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3',
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

      <Revela as="section" bloque className="mt-9 bg-amarillo text-tinta dark:border-t-4 dark:border-amarillo dark:bg-slate-900 dark:text-slate-100" aria-label="Cómo funciona">
        <div className="mx-auto grid max-w-[1240px] gap-5 px-5 py-6 md:grid-cols-3 md:gap-6">
          {[
            { icono: Store, titulo: 'Un pedido por puesto', texto: 'Compras directo a cada vendedor.' },
            { icono: MapPin, titulo: 'Sigue tu pedido', texto: 'Del puesto hasta tus manos, paso a paso.' },
            { icono: Star, titulo: 'Reseñas de compradores', texto: 'Solo opina quien recibió su pedido.' },
          ].map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="flex items-start gap-3">
              <Icono className="h-[30px] w-[30px] shrink-0 text-brand-700 dark:text-amarillo" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <b className="block">{titulo}</b>
                <span className="text-sm text-tinta/80 dark:text-slate-400">{texto}</span>
              </div>
            </div>
          ))}
        </div>
      </Revela>
    </div>
  );
}
