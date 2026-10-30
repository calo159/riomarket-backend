import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, PackageSearch, Star, Store } from 'lucide-react';
import { listarProductos, obtenerPuesto } from '../api/catalog';
import { listarResenas } from '../api/reviews';
import { ProductoCard } from '../components/ProductoCard';
import { Imagen } from '../components/Imagen';
import { urlAbsoluta } from '../lib/utils';
import { Estrellas } from '../components/ui/Estrellas';
import { CargandoPantalla, EsqueletoGrid, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
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
  const logo = urlAbsoluta(tienda.logo);

  const cambiarCategoria = (nueva: number | null) => {
    setCategoria(nueva);
    setPagina(1);
  };

  return (
    <div>
      <section className="border-b bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          {portada && (
            <div className="mb-6 aspect-[3/1] w-full overflow-hidden rounded-2xl">
              <Imagen
                src={portada}
                fallbackNombre={tienda.nombre}
                contenedorClassName="h-full w-full"
                alt={`Portada de ${tienda.nombre}`}
                width={1200}
                height={400}
                loading="eager" // portada del puesto: visible al abrir la página
              />
            </div>
          )}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {logo ? (
              <Imagen
                src={logo}
                fallbackNombre={tienda.nombre}
                contenedorClassName="h-20 w-20 shrink-0 rounded-2xl"
                alt={`Logo de ${tienda.nombre}`}
                width={80}
                height={80}
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Store className="h-10 w-10" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">{tienda.nombre}</h1>
                {tienda.estado !== 'activo' && (
                  <span className="badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    Puesto {tienda.estado}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {tienda.direccion}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : 'Sin reseñas'}
                  {tienda.cantidad_resenas > 0 && ` (${tienda.cantidad_resenas} reseñas)`}
                </span>
                {tienda.horario && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {tienda.horario}</span>}
                <span className="inline-flex items-center gap-1.5">
                  <Bike className="h-4 w-4" /> {tienda.ofrece_domicilio ? 'Ofrece domicilio' : 'Solo retiro en el puesto'}
                </span>
              </div>
              {tienda.descripcion && <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{tienda.descripcion}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {categorias.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cambiarCategoria(item.id)}
                    className={`badge transition ${
                      categoria === item.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Productos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {categoria ? categorias.find((item) => item.id === categoria)?.nombre : 'Todo el puesto'}
            </p>
          </div>
          {categoria && (
            <button type="button" className="btn-secondary" onClick={() => cambiarCategoria(null)}>
              Ver todas las categorías
            </button>
          )}
        </div>

        {productos.isLoading && <EsqueletoGrid cantidad={TAMANO} />}
        {productos.isError && <EstadoError mensaje="No pudimos cargar los productos del puesto." onReintentar={() => void productos.refetch()} />}
        {productos.data && productos.data.results.length === 0 && (
          <EstadoVacio
            titulo="Sin productos en esta categoría"
            descripcion="Este puesto todavía no tiene productos publicados aquí."
            icono={<PackageSearch className="h-8 w-8" />}
            accion={<Link to="/catalogo" className="btn-secondary">Explorar todo el catálogo</Link>}
          />
        )}
        {productos.data && productos.data.results.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <h2 className="text-2xl font-bold">Reseñas</h2>
          {resenas.isLoading && <p className="mt-2 text-sm text-slate-500">Cargando reseñas…</p>}
          {resenas.data && resenas.data.results.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
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
                  {resena.comentario && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{resena.comentario}</p>}
                  {resena.respuesta && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
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
