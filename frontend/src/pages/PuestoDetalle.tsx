import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, Navigation, PackageSearch, Star } from 'lucide-react';
import { listarProductos, obtenerPuesto } from '../api/catalog';
import { listarResenas } from '../api/reviews';
import { ProductoCard } from '../components/ProductoCard';
import { Imagen } from '../components/Imagen';
import { LogoPuesto } from '../components/PuestoCard';
import { urlAbsoluta } from '../lib/utils';
import { GRID_PRODUCTOS } from '../lib/estilos';
import { esErrorTemporal, mensajeDeCarga } from '../lib/errors';
import { Estrellas } from '../components/ui/Estrellas';
import { CargandoPantalla, EsqueletoGrid, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { formatearCalificacion } from '../lib/format';
import { claves } from '../lib/queryKeys';
import { BotonWhatsapp } from '../components/BotonWhatsapp';
import { MapaDiferido } from '../components/mapa/MapaDiferido';
import { mensajeWhatsappPuesto } from '../lib/whatsapp';
import { enlaceComoLlegar, enlaceComoLlegarGoogle, puestosConCoordenadas } from '../lib/mapa';

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
        <EstadoError
          mensaje={mensajeDeCarga(puesto.error, "No encontramos este puesto.")}
          onReintentar={esErrorTemporal(puesto.error) ? () => void puesto.refetch() : undefined}
        />
        <Link to="/catalogo" className="btn-secondary mt-4">Volver al catálogo</Link>
      </div>
    );
  }

  const tienda = puesto.data;
  const categorias = tienda.categorias as unknown as { id: number; nombre: string }[];
  const portada = urlAbsoluta(tienda.portada);
  const ubicacion = puestosConCoordenadas([tienda])[0];

  const cambiarCategoria = (nueva: number | null) => {
    setCategoria(nueva);
    setPagina(1);
  };

  return (
    <div>
      <div className="mx-auto max-w-[1240px] px-3 pt-4 sm:px-5">
        <section className="card overflow-hidden">
          <div className="h-32 w-full overflow-hidden bg-brand-600 sm:h-48 dark:bg-brand-800">
            {portada && (
              <Imagen
                src={portada}
                fallbackNombre={tienda.nombre}
                contenedorClassName="h-full w-full"
                alt={`Portada de ${tienda.nombre}`}
                width={1200}
                height={400}
                loading="eager" // portada del puesto: visible al abrir la página
              />
            )}
          </div>
          <div className="flex flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-start sm:px-6">
            <LogoPuesto
              nombre={tienda.nombre}
              logo={tienda.logo}
              className="-mt-10 h-20 w-20 text-2xl sm:-mt-12 sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1 sm:pt-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight">{tienda.nombre}</h1>
                {tienda.estado !== 'activo' && (
                  <span className="badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    Puesto {tienda.estado}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" /> {tienda.direccion}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-estrella text-estrella dark:fill-amber-400 dark:text-amber-400" aria-hidden="true" />
                  {formatearCalificacion(tienda.calificacion_promedio)}
                  {tienda.cantidad_resenas > 0 && ` (${tienda.cantidad_resenas} reseñas)`}
                </span>
                {tienda.horario && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" /> {tienda.horario}</span>}
                <span className={`inline-flex items-center gap-1.5 font-semibold ${tienda.ofrece_domicilio ? 'text-exito dark:text-[#6FD596]' : ''}`}>
                  <Bike className="h-4 w-4" aria-hidden="true" /> {tienda.ofrece_domicilio ? 'Ofrece domicilio' : 'Solo retiro en el puesto'}
                </span>
              </div>
              {tienda.descripcion && <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{tienda.descripcion}</p>}
              <BotonWhatsapp
                numero={tienda.whatsapp}
                mensaje={mensajeWhatsappPuesto(tienda.nombre)}
                className="mt-4"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {categorias.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cambiarCategoria(item.id)}
                    aria-pressed={categoria === item.id}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-semibold transition-colors md:min-h-[36px] ${
                      categoria === item.id
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-brand-600 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {item.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {ubicacion && (
        <div className="mx-auto max-w-[1240px] px-3 pt-4 sm:px-5">
          <section className="card grid overflow-hidden md:grid-cols-[minmax(0,1fr)_320px]" aria-labelledby="titulo-ubicacion">
            <div className="h-56 md:h-64">
              <MapaDiferido puestos={[ubicacion]} compacto etiqueta={`Ubicación de ${tienda.nombre}`} />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <h2 id="titulo-ubicacion" className="text-lg font-bold">Dónde queda</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">{tienda.direccion}</p>
              {tienda.horario && <p className="text-sm text-slate-600 dark:text-slate-300">{tienda.horario}</p>}
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <a
                  href={enlaceComoLlegar(ubicacion.lat, ubicacion.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-marca"
                >
                  <Navigation className="h-4 w-4" aria-hidden="true" /> Cómo llegar
                  <span className="sr-only"> (OpenStreetMap, se abre en una pestaña nueva)</span>
                </a>
                <a
                  href={enlaceComoLlegarGoogle(ubicacion.lat, ubicacion.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link text-sm"
                >
                  Abrir ruta en Google Maps
                </a>
                <Link to="/mapa" className="link text-sm">Ver todos los puestos en el mapa</Link>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="mx-auto max-w-[1240px] px-3 py-6 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[23px] font-bold tracking-tight">Productos</h2>
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
            <div className={GRID_PRODUCTOS}>
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
          <h2 className="text-[23px] font-bold tracking-tight">Reseñas del puesto</h2>
          {resenas.isLoading && <p className="mt-2 text-sm text-slate-500">Cargando reseñas…</p>}
          {resenas.data && resenas.data.results.length === 0 && (
            <p className="card mt-3 border-dashed px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
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
