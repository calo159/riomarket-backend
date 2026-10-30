import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bike,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Star,
} from 'lucide-react';
import { listarResenas } from '../api/reviews';
import { obtenerProducto, obtenerPuesto } from '../api/catalog';
import { formatearCalificacion, formatearMoneda } from '../lib/format';
import { urlAbsoluta } from '../lib/utils';
import { useCart } from '../cart/CartProvider';
import { useToast } from '../components/ui/Toast';
import { ConfirmarModal } from '../components/ui/Modal';
import { CargandoPantalla, EstadoError } from '../components/ui/Estado';
import { Estrellas } from '../components/ui/Estrellas';
import { useSession } from '../auth/SessionProvider';
import { Imagen } from '../components/Imagen';
import { claves } from '../lib/queryKeys';

export function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { carrito, agregar, reemplazarCon } = useCart();
  const toast = useToast();
  const { autenticado } = useSession();
  const [imagenActiva, setImagenActiva] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<'agregar' | 'comprar'>('agregar');

  const producto = useQuery({
    queryKey: claves.producto(id),
    queryFn: () => obtenerProducto(id!),
    enabled: Boolean(id),
  });

  const puesto = useQuery({
    queryKey: claves.puesto(producto.data?.id_puesto),
    queryFn: () => obtenerPuesto(producto.data!.id_puesto),
    enabled: Boolean(producto.data?.id_puesto),
  });

  const resenas = useQuery({
    queryKey: claves.resenas.deUnPuesto(producto.data?.id_puesto),
    queryFn: () => listarResenas({ puesto: producto.data!.id_puesto, page_size: 6 }),
    enabled: Boolean(producto.data?.id_puesto),
  });

  useEffect(() => {
    if (producto.data) document.title = `${producto.data.nombre} · RioMarket`;
  }, [producto.data]);

  useEffect(() => {
    setImagenActiva(0);
    setCantidad(1);
  }, [id]);

  if (producto.isLoading) return <CargandoPantalla />;
  if (producto.isError || !producto.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EstadoError mensaje="No encontramos este producto o ya no está disponible." />
        <Link to="/catalogo" className="btn-secondary mt-4">Volver al catálogo</Link>
      </div>
    );
  }

  const datos = producto.data;
  const tienda = puesto.data;
  const imagenes = datos.imagenes ?? [];
  const imagen = imagenes[imagenActiva];
  const agotado = (datos.stock ?? 0) <= 0;
  const stockMax = Math.max(0, datos.stock ?? 0);

  const agregarAlCarrito = () => {
    if (!tienda) return;
    if (carrito && carrito.puestoId !== tienda.id) {
      setAccionPendiente('agregar');
      setConfirmarReemplazo(true);
      return;
    }
    for (let i = 0; i < cantidad; i += 1) agregar(datos, tienda);
    toast.exito(`${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${datos.nombre} en la canasta.`);
  };

  const reemplazar = () => {
    if (!tienda) return;
    reemplazarCon(datos, tienda, cantidad);
    setConfirmarReemplazo(false);
    toast.exito('Canasta actualizada con este producto.');
    if (accionPendiente === 'comprar') {
      if (!autenticado) navigate('/login?redirect=%2Fcheckout');
      else navigate('/checkout');
    }
  };

  const comprarAhora = () => {
    if (!tienda) return;
    if (carrito && carrito.puestoId !== tienda.id) {
      setAccionPendiente('comprar');
      setConfirmarReemplazo(true);
      return;
    }
    for (let i = 0; i < cantidad; i += 1) agregar(datos, tienda);
    if (!autenticado) navigate('/login?redirect=%2Fcheckout');
    else navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
      <nav className="mb-4 hidden flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-slate-400 sm:flex" aria-label="Ruta de navegación">
        <Link to="/" className="hover:underline">Inicio</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link to="/catalogo" className="hover:underline">Catálogo</Link>
        {tienda && (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link to={`/puestos/${tienda.id}`} className="hover:underline">{tienda.nombre}</Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-slate-900 dark:text-slate-200">{datos.nombre}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-lg sm:aspect-square">
            <Imagen
              src={urlAbsoluta(imagen?.url || imagen?.miniatura)}
              fallbackNombre={datos.nombre}
              categoriaId={datos.id_categoria}
              contenedorClassName="h-full w-full"
              alt={imagen?.alt || datos.nombre}
              width={imagen?.ancho ?? undefined}
              height={imagen?.alto ?? undefined}
              loading="eager" // es la imagen principal, visible al abrir la página
            />
          </div>
          {imagenes.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto p-1">
              {imagenes.map((item, indice) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImagenActiva(indice)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 sm:h-20 sm:w-20 ${
                    indice === imagenActiva ? 'border-brand-600 dark:border-sol-400' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Ver imagen ${indice + 1}`}
                  aria-pressed={indice === imagenActiva}
                >
                  <Imagen
                    src={urlAbsoluta(item.miniatura || item.url)}
                    fallbackNombre={datos.nombre}
                    categoriaId={datos.id_categoria}
                    width={80}
                    height={80}
                    contenedorClassName="h-full w-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl leading-tight sm:text-4xl">{datos.nombre}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
            {tienda && (
              <Link to={`/puestos/${tienda.id}`} className="link">
                {tienda.nombre}
              </Link>
            )}
            {tienda && (
              <span className="tnum inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-sol-400 text-sol-600" aria-hidden="true" />
                {formatearCalificacion(tienda.calificacion_promedio)}
                {tienda.cantidad_resenas > 0 && ` (${tienda.cantidad_resenas})`}
              </span>
            )}
            {tienda?.ofrece_domicilio && (
              <span className="inline-flex items-center gap-1">
                <Bike className="h-4 w-4" aria-hidden="true" /> Domicilio disponible
              </span>
            )}
            {datos.estado !== 'activo' && (
              <span className="badge bg-rojo-600 text-white">Producto {datos.estado}</span>
            )}
          </div>

          <p className="tnum mt-3 text-4xl font-extrabold">
            {formatearMoneda(datos.precio)}
            <span className="ml-1.5 text-base font-normal text-slate-600 dark:text-slate-400">
              / {datos.unidad_medida ?? 'unidad'}
            </span>
          </p>
          <p className={`mt-0.5 text-sm font-medium ${agotado ? 'text-rojo-700 dark:text-rojo-300' : 'text-slate-600 dark:text-slate-400'}`}>
            {agotado ? 'Agotado por ahora' : `${stockMax} disponibles`}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border-2 border-slate-900 dark:border-slate-300">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
                onClick={() => setCantidad((valor) => Math.max(1, valor - 1))}
                disabled={cantidad <= 1}
                aria-label="Quitar una unidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="tnum w-10 text-center font-bold" aria-live="polite">{cantidad}</span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
                onClick={() => setCantidad((valor) => Math.min(stockMax, valor + 1))}
                disabled={cantidad >= stockMax}
                aria-label="Agregar una unidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="tnum text-sm text-slate-700 dark:text-slate-300">
              Total: <strong className="text-slate-950 dark:text-white">{formatearMoneda(Number(datos.precio) * cantidad)}</strong>
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary min-h-12 flex-1" onClick={agregarAlCarrito} disabled={agotado || !tienda}>
              Agregar a la canasta
            </button>
            <button type="button" className="btn-secondary min-h-12 flex-1" onClick={comprarAhora} disabled={agotado || !tienda}>
              Comprar ahora
            </button>
          </div>

          {datos.descripcion && (
            <div className="mt-6">
              <h2 className="text-lg">Descripción</h2>
              <p className="mt-1 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                {datos.descripcion}
              </p>
            </div>
          )}

          {tienda && (
            <div className="mt-6 border-t pt-4">
              <Link to={`/puestos/${tienda.id}`} className="font-extrabold hover:underline">{tienda.nombre}</Link>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {tienda.direccion}
              </p>
              {tienda.horario && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Horario: {tienda.horario}</p>}
            </div>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-2xl">Reseñas del puesto</h2>
        {resenas.isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Cargando reseñas…</p>}
        {resenas.data && resenas.data.results.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300">
            Este puesto aún no tiene reseñas.
          </p>
        )}
        {resenas.data && resenas.data.results.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {resenas.data.results.map((resena) => (
              <article key={resena.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{resena.usuario_nombre}</p>
                  <Estrellas valor={resena.calificacion} />
                </div>
                {resena.comentario && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{resena.comentario}</p>}
                {resena.respuesta && (
                  <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Respuesta del vendedor</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{resena.respuesta}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmarModal
        abierto={confirmarReemplazo}
        titulo="Tu canasta tiene productos de otro puesto"
        descripcion={`Al continuar se vaciará la canasta de "${carrito?.puestoNombre ?? ''}" y se agregará este producto de "${tienda?.nombre ?? ''}".`}
        textoConfirmar="Vaciar y agregar"
        onConfirmar={reemplazar}
        onCerrar={() => setConfirmarReemplazo(false)}
      />
    </div>
  );
}
