import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, Star } from 'lucide-react';
import { listarProductos, obtenerPuesto } from '../api/catalog';
import { listarResenas } from '../api/reviews';
import { ProductoCard } from '../components/ProductoCard';
import { Imagen } from '../components/Imagen';
import { Reticula } from '../components/Reticula';
import { categoriaPrincipalDe } from '../components/PuestoCard';
import { clasesDeCategoria } from '../lib/categoria';
import { cn, urlAbsoluta } from '../lib/utils';
import { Estrellas } from '../components/ui/Estrellas';
import { CargandoPantalla, EsqueletoGrid, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { formatearCalificacion } from '../lib/format';
import { claves } from '../lib/queryKeys';

const TAMANO = 12;

export function PuestoDetalle() {
  const { id } = useParams();
  const [categoria, setCategoria] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);

  const puesto = useQuery({
    queryKey: claves.puesto(id),
    queryFn: () => obtenerPuesto(id!),
    enabled: Boolean(id),
  });

  const productos = useQuery({
    queryKey: claves.productos.deUnPuesto(id, categoria, pagina),
    queryFn: () =>
      listarProductos({
        puesto: id!,
        categoria: categoria ?? undefined,
        page: pagina,
        page_size: TAMANO,
      }),
    enabled: Boolean(id),
    placeholderData: (anterior) => anterior,
  });

  const resenas = useQuery({
    queryKey: claves.resenas.deUnPuesto(id),
    queryFn: () => listarResenas({ puesto: id!, page_size: 10 }),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (puesto.data) document.title = `${puesto.data.nombre} · RioMarket`;
  }, [puesto.data]);

  if (puesto.isLoading) return <CargandoPantalla />;
  if (puesto.isError || !puesto.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EstadoError mensaje="No encontramos este puesto." />
        <Link to="/catalogo" className="btn-secondary mt-4">Volver al catálogo</Link>
      </div>
    );
  }

  const tienda = puesto.data;
  const categorias = tienda.categorias as unknown as { id: number; nombre: string }[];
  const portada = urlAbsoluta(tienda.portada);
  // El letrero siempre lleva texto claro: si la categoría principal es amarilla, usa la verde.
  const idCategoria = categoriaPrincipalDe(tienda) ?? tienda.id;
  const categoriaLetrero = clasesDeCategoria(idCategoria).color === 'amarillo' ? idCategoria + 1 : idCategoria;
  const letrero = clasesDeCategoria(categoriaLetrero);
  const logo = urlAbsoluta(tienda.logo);

  const cambiarCategoria = (nueva: number | null) => {
    setCategoria(nueva);
    setPagina(1);
  };

  return (
    <div>
      <section className={cn('relative overflow-hidden px-4 pb-14 pt-12 sm:px-6', letrero.bloque)}>
        <span className="asa" aria-hidden="true" />
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center">
          {logo && (
            <Imagen
              src={logo}
              fallbackNombre={tienda.nombre}
              categoriaId={categoriaLetrero}
              contenedorClassName="h-20 w-20 shrink-0 rounded-lg"
              alt={`Logo de ${tienda.nombre}`}
              width={80}
              height={80}
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl leading-tight sm:text-6xl">{tienda.nombre}</h1>
            {tienda.estado !== 'activo' && (
              <span className="badge mt-2 bg-white text-rojo-700">Puesto {tienda.estado}</span>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" /> {tienda.direccion}</span>
              <span className="tnum inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                {formatearCalificacion(tienda.calificacion_promedio)}
                {tienda.cantidad_resenas > 0 && ` (${tienda.cantidad_resenas} reseñas)`}
              </span>
              {tienda.horario && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" /> {tienda.horario}</span>}
              <span className="inline-flex items-center gap-1.5">
                <Bike className="h-4 w-4" aria-hidden="true" /> {tienda.ofrece_domicilio ? 'Ofrece domicilio' : 'Solo retiro en el puesto'}
              </span>
            </div>
          </div>
        </div>
        <Reticula className={cn('absolute inset-x-0 bottom-0 h-7', letrero.ranuras)} />
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {(portada || tienda.descripcion) && (
          <div className="mb-6 grid gap-4 md:grid-cols-[2fr_3fr]">
            {portada && (
              <div className="aspect-[3/1] w-full overflow-hidden rounded-lg md:col-span-2 md:aspect-[6/1]">
                <Imagen
                  src={portada}
                  fallbackNombre={tienda.nombre}
                  categoriaId={categoriaLetrero}
                  contenedorClassName="h-full w-full"
                  alt={`Portada de ${tienda.nombre}`}
                  width={1200}
                  height={400}
                  loading="eager" // portada del puesto: visible al abrir la página
                />
              </div>
            )}
            {tienda.descripcion && <p className="max-w-3xl text-slate-700 dark:text-slate-300 md:col-span-2">{tienda.descripcion}</p>}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Productos</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías del puesto">
            {categorias.map((item) => {
              const clases = clasesDeCategoria(item.id);
              const activa = categoria === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => cambiarCategoria(activa ? null : item.id)}
                  aria-pressed={activa}
                  className={cn('btn min-h-9 border-2 px-3 py-1', activa ? clases.chipActivo : clases.chip)}
                >
                  {item.nombre}
                </button>
              );
            })}
          </div>
        </div>

        {productos.isLoading && <EsqueletoGrid cantidad={TAMANO} />}
        {productos.isError && <EstadoError mensaje="No pudimos cargar los productos del puesto." onReintentar={() => void productos.refetch()} />}
        {productos.data && productos.data.results.length === 0 && (
          <EstadoVacio
            titulo="Sin productos en esta categoría"
            descripcion="Este puesto todavía no tiene productos publicados aquí."
            accion={<Link to="/catalogo" className="btn-secondary">Explorar todo el catálogo</Link>}
          />
        )}
        {productos.data && productos.data.results.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {productos.data.results.map((producto) => (
                <ProductoCard key={producto.id} producto={producto} puesto={tienda} />
              ))}
            </div>
            <Paginacion
              pagina={pagina}
              total={productos.data.count}
              tamano={TAMANO}
              cargando={productos.isFetching}
              onCambiar={setPagina}
            />
          </>
        )}

        <section className="mt-12">
          <h2 className="text-2xl">Reseñas</h2>
          {resenas.isLoading && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Cargando reseñas…</p>}
          {resenas.data && resenas.data.results.length === 0 && (
            <p className="mt-3 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300">
              Este puesto aún no tiene reseñas. Compra y sé el primero en opinar.
            </p>
          )}
          {resenas.data && resenas.data.results.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {resenas.data.results.map((resena) => (
                <article key={resena.id} className="card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{resena.usuario_nombre}</p>
                    <Estrellas valor={resena.calificacion} />
                  </div>
                  {resena.comentario && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{resena.comentario}</p>}
                  {resena.respuesta && (
                    <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
                      <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Respuesta del vendedor</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{resena.respuesta}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
