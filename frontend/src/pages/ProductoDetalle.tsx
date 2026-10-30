import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bike,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Store,
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
    toast.exito(`${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${datos.nombre} en el carrito.`);
  };

  const reemplazar = () => {
    if (!tienda) return;
    reemplazarCon(datos, tienda, cantidad);
    setConfirmarReemplazo(false);
    toast.exito('Carrito actualizado con este producto.');
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400" aria-label="Ruta de navegación">
        <Link to="/" className="hover:underline">Inicio</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/catalogo" className="hover:underline">Catálogo</Link>
        {tienda && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/puestos/${tienda.id}`} className="hover:underline">{tienda.nombre}</Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-slate-800 dark:text-slate-200">{datos.nombre}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="card aspect-square overflow-hidden">
            <Imagen
              src={urlAbsoluta(imagen?.url || imagen?.miniatura)}
              fallbackNombre={datos.nombre}
              contenedorClassName="h-full w-full"
              alt={imagen?.alt || datos.nombre}
              width={imagen?.ancho ?? undefined}
              height={imagen?.alto ?? undefined}
              loading="eager" // es la imagen principal, visible al abrir la página
            />
          </div>
          {imagenes.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {imagenes.map((item, indice) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImagenActiva(indice)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                    indice === imagenActiva ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Ver imagen ${indice + 1}`}
                >
                  <Imagen
                    src={urlAbsoluta(item.miniatura || item.url)}
                    fallbackNombre={datos.nombre}
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{datos.nombre}</h1>
              {tienda && (
                <Link to={`/puestos/${tienda.id}`} className="link mt-1 inline-flex items-center gap-1 text-sm">
                  <Store className="h-4 w-4" /> {tienda.nombre}
                </Link>
              )}
            </div>
            {datos.estado !== 'activo' && (
              <span className="badge bg-rojo-100 text-rojo-800 dark:bg-rojo-950 dark:text-rojo-300">
                Producto {datos.estado}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            {tienda && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-sol-400 text-sol-400" />
                {formatearCalificacion(tienda.calificacion_promedio)}
                {tienda.cantidad_resenas > 0 && ` (${tienda.cantidad_resenas})`}
              </span>
            )}
            {tienda?.ofrece_domicilio && (
              <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300">
                <Bike className="h-4 w-4" /> Domicilio disponible
              </span>
            )}
          </div>

          <p className="mt-6 text-4xl font-extrabold text-brand-800 dark:text-brand-300">
            {formatearMoneda(datos.precio)}
            <span className="ml-1 text-base font-medium text-slate-500 dark:text-slate-400">
              / {datos.unidad_medida ?? 'unidad'}
            </span>
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {agotado ? 'Agotado por ahora' : `${stockMax} disponibles`}
          </p>

          {datos.descripcion && (
            <div className="mt-6">
              <h2 className="font-semibold">Descripción</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {datos.descripcion}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border">
              <button
                type="button"
                className="p-3 text-slate-600 disabled:opacity-40 dark:text-slate-300"
                onClick={() => setCantidad((valor) => Math.max(1, valor - 1))}
                disabled={cantidad <= 1}
                aria-label="Quitar una unidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold" aria-live="polite">{cantidad}</span>
              <button
                type="button"
                className="p-3 text-slate-600 disabled:opacity-40 dark:text-slate-300"
                onClick={() => setCantidad((valor) => Math.min(stockMax, valor + 1))}
                disabled={cantidad >= stockMax}
                aria-label="Agregar una unidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total: <strong className="text-slate-800 dark:text-slate-200">{formatearMoneda(Number(datos.precio) * cantidad)}</strong>
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary flex-1 py-3" onClick={agregarAlCarrito} disabled={agotado || !tienda}>
              <ShoppingCart className="h-5 w-5" /> Agregar al carrito
            </button>
            <button type="button" className="btn-secondary flex-1 py-3" onClick={comprarAhora} disabled={agotado || !tienda}>
              Comprar ahora
            </button>
          </div>

          {tienda && (
            <div className="card mt-6 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Store className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <Link to={`/puestos/${tienda.id}`} className="font-semibold hover:underline">{tienda.nombre}</Link>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5" /> {tienda.direccion}
                  </p>
                  {tienda.horario && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Horario: {tienda.horario}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reseñas del puesto</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Opiniones de compradores reales.</p>
          </div>
        </div>
        {resenas.isLoading && <p className="text-sm text-slate-500">Cargando reseñas…</p>}
        {resenas.data && resenas.data.results.length === 0 && (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Este puesto aún no tiene reseñas.
          </p>
        )}
        {resenas.data && resenas.data.results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
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

      <ConfirmarModal
        abierto={confirmarReemplazo}
        titulo="Tu carrito tiene productos de otro puesto"
        descripcion={`Al continuar se vaciará el carrito de "${carrito?.puestoNombre ?? ''}" y se agregará este producto de "${tienda?.nombre ?? ''}".`}
        textoConfirmar="Vaciar y agregar"
        onConfirmar={reemplazar}
        onCerrar={() => setConfirmarReemplazo(false)}
      />
    </div>
  );
}
