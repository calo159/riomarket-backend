import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { listarResenas } from '../api/reviews';
import { listarCategorias, listarProductos, obtenerProducto, obtenerPuesto } from '../api/catalog';
import { ImagenAmpliable } from '../components/ImagenAmpliable';
import { LogoPuesto } from '../components/PuestoCard';
import { volarAlCarrito } from '../lib/volarAlCarrito';
import { esErrorTemporal, mensajeDeCarga } from '../lib/errors';
import { formatearMoneda } from '../lib/format';
import { MAX_DETALLES, esEncargo, etiquetaDeDetalles, formatearPreparacion, topeDe } from '../lib/encargos';
import { urlAbsoluta } from '../lib/utils';
import { useCart } from '../cart/CartProvider';
import { useToast } from '../components/ui/Toast';
import { ConfirmarModal } from '../components/ui/Modal';
import { CargandoPantalla, EstadoError } from '../components/ui/Estado';
import { Estrellas } from '../components/ui/Estrellas';
import { useSession } from '../auth/SessionProvider';
import { Imagen } from '../components/Imagen';
import { claves } from '../lib/queryKeys';
import { BotonWhatsapp } from '../components/BotonWhatsapp';
import { mensajeWhatsappProducto } from '../lib/whatsapp';

export function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { carrito, agregar, reemplazarCon } = useCart();
  const toast = useToast();
  const { autenticado } = useSession();
  const [imagenActiva, setImagenActiva] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [detalles, setDetalles] = useState('');
  const [errorDetalles, setErrorDetalles] = useState('');
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const botonAgregar = useRef<HTMLButtonElement>(null);
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

  const categorias = useQuery({ queryKey: claves.categorias, queryFn: listarCategorias, staleTime: 5 * 60_000 });
  const masDelPuesto = useQuery({
    queryKey: [...claves.productos.todos, 'mas-del-puesto', producto.data?.id_puesto] as const,
    queryFn: () => listarProductos({ puesto: producto.data!.id_puesto, page: 1, page_size: 5 }),
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
    setDetalles('');
    setErrorDetalles('');
  }, [id]);

  if (producto.isLoading) return <CargandoPantalla />;
  if (producto.isError || !producto.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EstadoError
          mensaje={mensajeDeCarga(producto.error, "No encontramos este producto o ya no está disponible.")}
          onReintentar={esErrorTemporal(producto.error) ? () => void producto.refetch() : undefined}
        />
        <Link to="/catalogo" className="btn-secondary mt-4">Volver al catálogo</Link>
      </div>
    );
  }

  const datos = producto.data;
  const tienda = puesto.data;
  const imagenes = datos.imagenes ?? [];
  const imagen = imagenes[imagenActiva];
  // Un encargo no tiene stock: se pueden pedir hasta 20 y nunca figura como agotado (ADR-013).
  const encargo = esEncargo(datos);
  const agotado = !encargo && (datos.stock ?? 0) <= 0;
  const stockMax = topeDe(datos);
  const etiquetaDetalles = etiquetaDeDetalles(datos.etiqueta_detalles);
  const preparacion = formatearPreparacion(datos.preparacion_horas ?? 0);

  /** Un encargo que pide detalles no se agrega sin ellos. */
  const detallesCompletos = () => {
    if (encargo && datos.pide_detalles && !detalles.trim()) {
      setErrorDetalles(`Escribe ${etiquetaDetalles.charAt(0).toLowerCase()}${etiquetaDetalles.slice(1)} para poder encargarlo.`);
      return false;
    }
    setErrorDetalles('');
    return true;
  };

  const agregarAlCarrito = () => {
    if (!tienda || !detallesCompletos()) return;
    if (carrito && carrito.puestoId !== tienda.id) {
      setAccionPendiente('agregar');
      setConfirmarReemplazo(true);
      return;
    }
    agregar(datos, tienda, { cantidad, detalles: detalles.trim() });
    volarAlCarrito(botonAgregar.current, urlAbsoluta(imagen?.miniatura || imagen?.url));
    toast.exito(
      encargo
        ? `Encargo de ${datos.nombre} en el carrito.`
        : `${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${datos.nombre} en el carrito.`,
    );
    setAgregado(true);
    window.setTimeout(() => setAgregado(false), 1500);
  };

  const reemplazar = () => {
    if (!tienda) return;
    reemplazarCon(datos, tienda, cantidad, detalles.trim());
    setConfirmarReemplazo(false);
    toast.exito('Carrito actualizado con este producto.');
    if (accionPendiente === 'comprar') {
      if (!autenticado) navigate('/login?redirect=%2Fcheckout');
      else navigate('/checkout');
    }
  };

  const comprarAhora = () => {
    if (!tienda || !detallesCompletos()) return;
    if (carrito && carrito.puestoId !== tienda.id) {
      setAccionPendiente('comprar');
      setConfirmarReemplazo(true);
      return;
    }
    agregar(datos, tienda, { cantidad, detalles: detalles.trim() });
    if (!autenticado) navigate('/login?redirect=%2Fcheckout');
    else navigate('/checkout');
  };

  const categoriaNombre = categorias.data?.find((c) => c.id === datos.id_categoria)?.nombre ?? null;
  const otros = (masDelPuesto.data?.results ?? []).filter((p) => p.id !== datos.id).slice(0, 4);
  const calificacion = tienda?.calificacion_promedio ?? datos.puesto_calificacion;
  const nombrePuesto = tienda?.nombre ?? datos.puesto_nombre;
  const domicilio = tienda ? tienda.ofrece_domicilio : datos.puesto_ofrece_domicilio;
  const quedan = !encargo && !agotado && stockMax <= 5;

  return (
    <div className="mx-auto max-w-[1240px] px-3 pb-8 sm:px-5">
      <nav className="flex flex-wrap items-center gap-1 py-3 text-[13px] text-slate-500 dark:text-slate-400" aria-label="Ruta de navegación">
        <Link to="/tienda" className="link">Inicio</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link to={categoriaNombre ? `/catalogo?categoria=${datos.id_categoria}` : '/catalogo'} className="link">
          {categoriaNombre ?? 'Catálogo'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-slate-800 dark:text-slate-200">{datos.nombre}</span>
      </nav>

      <div className={`card grid gap-4 p-3 md:p-5 ${imagenes.length > 1 ? 'lg:grid-cols-[76px_minmax(0,1fr)_372px]' : 'lg:grid-cols-[minmax(0,1fr)_372px]'}`}>
        {imagenes.length > 1 && (
        <div className="order-2 flex gap-2 overflow-x-auto lg:order-none lg:flex-col lg:overflow-visible">
          {imagenes.map((item, indice) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setImagenActiva(indice)}
                aria-pressed={indice === imagenActiva}
                className={`h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[7px] border-2 bg-white p-0 transition-colors ${
                  indice === imagenActiva ? 'border-brand-600 dark:border-brand-300' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                }`}
                aria-label={`Ver foto ${indice + 1}`}
              >
                <Imagen
                  src={urlAbsoluta(item.miniatura || item.url)}
                  fallbackNombre={datos.nombre}
                  categoria={categoriaNombre}
                  width={72}
                  height={72}
                  contenedorClassName="h-full w-full"
                />
              </button>
            ))}
        </div>
        )}

        <ImagenAmpliable
          key={imagenActiva}
          nombre={datos.nombre}
          className="aspect-square max-h-[520px] w-full rounded-lg bg-slate-50 dark:bg-slate-800"
        >
          <Imagen
            src={urlAbsoluta(imagen?.url || imagen?.miniatura)}
            fallbackNombre={datos.nombre}
            categoria={categoriaNombre}
            contenedorClassName="h-full w-full"
            className="animate-fadein"
            alt={imagen?.alt || datos.nombre}
            width={imagen?.ancho ?? undefined}
            height={imagen?.alto ?? undefined}
            {...(imagen?.miniatura && imagen.miniatura !== imagen.url
              ? {
                  srcSet: `${urlAbsoluta(imagen.miniatura)} 400w, ${urlAbsoluta(imagen.url)} ${imagen.ancho ?? 640}w`,
                  sizes: '(min-width: 768px) 560px, 100vw',
                }
              : {})}
            prioridad // es la imagen principal, visible al abrir la página
          />
        </ImagenAmpliable>

        <aside className="flex flex-col gap-2.5 self-start rounded-xl border border-slate-200 p-4 dark:border-slate-700 md:p-[18px]" aria-label="Comprar">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            {encargo
              ? `Por encargo · listo en ~${preparacion}`
              : agotado
                ? 'Agotado por ahora'
                : quedan
                  ? `Quedan ${stockMax}`
                  : `${stockMax} disponibles`}
            {datos.estado !== 'activo' && (
              <span className="badge ml-2 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Producto {datos.estado}</span>
            )}
          </p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{datos.nombre}</h1>
          {calificacion ? (
            <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-bold text-estrella dark:text-amber-400">★ {calificacion.toFixed(1)}</span>
              {tienda && tienda.cantidad_resenas > 0 && `${tienda.cantidad_resenas} ${tienda.cantidad_resenas === 1 ? 'reseña' : 'reseñas'} del puesto`}
            </p>
          ) : null}
          <p className="precio text-[34px] leading-none md:text-[38px]">
            {formatearMoneda(Number(datos.precio) * cantidad)}{' '}
            <small className="text-[15px] font-medium tracking-normal text-slate-500 dark:text-slate-400">
              {cantidad > 1 ? `por ${cantidad} ${datos.unidad_medida ?? 'unidad'}` : `/ ${datos.unidad_medida ?? 'unidad'}`}
            </small>
          </p>
          {domicilio !== undefined && (
            <p className={`flex items-center gap-1.5 text-sm font-semibold ${domicilio ? 'text-exito dark:text-[#6FD596]' : 'text-slate-500 dark:text-slate-400'}`}>
              <Truck className="h-[18px] w-[18px]" aria-hidden="true" />
              {domicilio ? 'Domicilio en Riohacha o retiro en el puesto' : 'Retiro en el puesto'}
            </p>
          )}

          {encargo && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <p className="font-medium">
                Se hace por encargo. {nombrePuesto ?? 'El puesto'} necesita {preparacion} para prepararlo.
              </p>
              {datos.pide_detalles && (
                <div>
                  <label className="label" htmlFor="detalles-encargo">{etiquetaDetalles}</label>
                  <textarea
                    id="detalles-encargo"
                    rows={3}
                    maxLength={MAX_DETALLES}
                    className="input resize-y"
                    value={detalles}
                    onChange={(evento) => {
                      setDetalles(evento.target.value);
                      if (evento.target.value.trim()) setErrorDetalles('');
                    }}
                    aria-invalid={errorDetalles ? true : undefined}
                    aria-describedby="detalles-ayuda"
                  />
                  <div className="mt-1 flex items-start justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span id="detalles-ayuda">El puesto lo lee antes de aceptar tu encargo.</span>
                    <span className="shrink-0 tabular-nums">{detalles.length}/{MAX_DETALLES}</span>
                  </div>
                  {errorDetalles && <p className="field-error" role="alert">{errorDetalles}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            Cantidad
            <div className="inline-flex items-center overflow-hidden rounded-[7px] border border-slate-300 dark:border-slate-600">
              <button
                type="button"
                className="grid h-11 w-11 place-items-center text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 dark:text-brand-200 dark:hover:bg-slate-800"
                onClick={() => setCantidad((valor) => Math.max(1, valor - 1))}
                disabled={cantidad <= 1}
                aria-label="Quitar una unidad"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-[42px] text-center font-bold tabular-nums" aria-live="polite">{cantidad}</span>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 dark:text-brand-200 dark:hover:bg-slate-800"
                onClick={() => setCantidad((valor) => Math.min(stockMax, valor + 1))}
                disabled={cantidad >= stockMax}
                aria-label="Agregar una unidad"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {datos.unidad_medida ?? 'unidad'}
          </div>

          <button type="button" className="btn-primary min-h-[48px] text-base" onClick={comprarAhora} disabled={agotado || !tienda}>
            Comprar ahora
          </button>
          <button
            ref={botonAgregar}
            type="button"
            className={`btn min-h-[48px] text-base ${agregado ? 'bg-exito text-white' : 'btn-marca'}`}
            onClick={agregarAlCarrito}
            disabled={agotado || !tienda}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />{' '}
            {agregado ? 'Agregado al carrito' : encargo ? 'Agregar encargo al carrito' : 'Agregar al carrito'}
          </button>

          {nombrePuesto && (
            <div className="mt-0.5 flex items-center gap-2.5 border-t border-slate-200 pt-3 dark:border-slate-700">
              {tienda ? <LogoPuesto nombre={tienda.nombre} logo={tienda.logo} className="h-11 w-11 text-base" /> : null}
              <div className="min-w-0">
                <Link to={`/puestos/${datos.id_puesto}`} className="font-bold hover:underline">{nombrePuesto}</Link>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  {tienda?.horario ? `${tienda.horario} · ` : ''}
                  {tienda?.direccion}
                </p>
              </div>
            </div>
          )}
          <BotonWhatsapp
            numero={tienda?.whatsapp}
            mensaje={mensajeWhatsappProducto(datos.nombre)}
            className="min-h-[48px] text-base"
          />
        </aside>
      </div>

      {datos.descripcion && (
        <section className="card mt-3.5 p-5">
          <h2 className="mb-2 text-xl font-bold">Descripción</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{datos.descripcion}</p>
        </section>
      )}

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_372px]">
        <section className="card p-5" aria-label="Reseñas del puesto">
          <h2 className="mb-1 text-xl font-bold">Reseñas del puesto</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Opiniones sobre {nombrePuesto ?? 'el puesto'}, de compradores que recibieron su pedido.
          </p>
          {calificacion ? (
            <div className="mb-2 flex items-center gap-4">
              <span className="text-[42px] font-bold leading-none">{calificacion.toFixed(1)}</span>
              <div>
                <Estrellas valor={calificacion} tamano="h-5 w-5" etiqueta={`Calificación del puesto: ${calificacion.toFixed(1)} de 5`} />
                {tienda && <p className="text-[13px] text-slate-500 dark:text-slate-400">{tienda.cantidad_resenas} reseñas</p>}
              </div>
            </div>
          ) : null}
          {resenas.isLoading && <p className="text-sm text-slate-500">Cargando reseñas…</p>}
          {resenas.data && resenas.data.results.length === 0 && (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Este puesto aún no tiene reseñas.
            </p>
          )}
          {resenas.data?.results.map((resena) => (
            <article key={resena.id} className="border-t border-slate-100 py-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{resena.usuario_nombre}</p>
                <Estrellas valor={resena.calificacion} />
              </div>
              {resena.comentario && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{resena.comentario}</p>}
              {resena.respuesta && (
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                  <p className="text-xs font-bold text-brand-700 dark:text-brand-300">Respuesta del vendedor</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{resena.respuesta}</p>
                </div>
              )}
            </article>
          ))}
        </section>

        {otros.length > 0 && (
          <aside className="card self-start p-5" aria-label="Más de este puesto">
            <h2 className="mb-2.5 text-xl font-bold">Más de este puesto</h2>
            {otros.map((otro) => (
              <Link
                key={otro.id}
                to={`/productos/${otro.id}`}
                className="flex items-center gap-2.5 border-t border-slate-100 py-2.5 text-tinta transition-colors first:border-t-0 hover:text-brand-600 dark:border-slate-800 dark:text-slate-100 dark:hover:text-brand-300"
              >
                <Imagen
                  src={urlAbsoluta(otro.imagenes?.[0]?.miniatura || otro.imagenes?.[0]?.url)}
                  fallbackNombre={otro.nombre}
                  categoria={categoriaNombre}
                  contenedorClassName="h-[58px] w-[58px] shrink-0 rounded-[7px]"
                />
                <span className="min-w-0">
                  <b className="block">{formatearMoneda(otro.precio)}</b>
                  <span className="line-clamp-2 text-sm">{otro.nombre}</span>
                </span>
              </Link>
            ))}
          </aside>
        )}
      </div>

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
