import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, Plus, Truck } from 'lucide-react';
import type { Producto, Puesto } from '../lib/types';
import { formatearMoneda } from '../lib/format';
import { esEncargo, formatearPreparacion } from '../lib/encargos';
import { urlAbsoluta } from '../lib/utils';
import { useCart } from '../cart/CartProvider';
import { useToast } from './ui/Toast';
import { obtenerPuesto } from '../api/catalog';
import { mensajeDeError } from '../lib/errors';
import { abrirConFotoCompartida } from '../lib/fotoCompartida';
import { claves } from '../lib/queryKeys';
import { volarAlCarrito } from '../lib/volarAlCarrito';
import { Imagen } from './Imagen';

/** Ancho de la tarjeta según la rejilla: ½ en celular, ⅓ en tableta y ≈230 px en escritorio. */
export const SIZES_TARJETA = '(min-width: 1280px) 230px, (min-width: 768px) 33vw, 50vw';
/** Lado de la miniatura que genera el servidor (apps/common/image_processing.py: THUMB_DIM). */
const LADO_MINIATURA = 400;

/**
 * Atributos de la foto de una tarjeta. Usa la miniatura (≈400 px) y deja la grande como segunda
 * opción del `srcset` para pantallas de alta densidad; si no hay miniatura distinta, solo la grande.
 */
export function atributosFotoTarjeta(producto: Producto) {
  const img0 = producto.imagenes?.[0];
  const grande = urlAbsoluta(img0?.url || img0?.miniatura);
  const mini = urlAbsoluta(img0?.miniatura);
  if (mini && grande && mini !== grande) {
    return {
      src: mini,
      srcSet: `${mini} ${LADO_MINIATURA}w, ${grande} ${img0?.ancho ?? 640}w`,
      sizes: SIZES_TARJETA,
      // Las tarjetas son cuadradas: reservar el espacio evita saltos de diseño.
      width: LADO_MINIATURA,
      height: LADO_MINIATURA,
    };
  }
  return { src: grande, width: img0?.ancho ?? undefined, height: img0?.alto ?? undefined };
}

export function ImagenProducto({
  producto,
  className,
  categoria,
  prioridad,
  cargaInmediata,
}: {
  producto: Producto;
  className?: string;
  /** Nombre de la categoría, para el icono de la reserva sin foto. */
  categoria?: string | null;
  /** Foto candidata a LCP: se pide ya y con prioridad alta. */
  prioridad?: boolean;
  /** Foto visible sin desplazarse: se pide ya (sin esperar a la carga diferida), con prioridad normal. */
  cargaInmediata?: boolean;
}) {
  const img0 = producto.imagenes?.[0];
  return (
    <Imagen
      {...atributosFotoTarjeta(producto)}
      {...(cargaInmediata && !prioridad ? { loading: 'eager' as const } : {})}
      fallbackNombre={producto.nombre}
      categoria={categoria}
      contenedorClassName={className}
      className="transition duration-[400ms] ease-out group-hover:scale-105"
      alt={img0?.alt || producto.nombre}
      prioridad={prioridad}
    />
  );
}

export function ProductoCard({
  producto,
  puesto,
  categoria,
  prioridad,
  cargaInmediata,
}: {
  producto: Producto;
  puesto?: Puesto;
  /** Nombre de la categoría del producto (lo conoce la pantalla que ya cargó las categorías). */
  categoria?: string | null;
  /** Las primeras tarjetas (candidatas a LCP) cargan su foto con prioridad alta. */
  prioridad?: boolean;
  /** Las tarjetas visibles sin desplazarse piden su foto de inmediato en vez de esperar a la carga diferida. */
  cargaInmediata?: boolean;
}) {
  const { agregar } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [agregando, setAgregando] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const foto = useRef<HTMLAnchorElement>(null);
  const temporizador = useRef<number>();
  const stock = producto.stock ?? 0;
  // Un encargo no tiene stock: nunca está «agotado» ni «quedan N» (ADR-013).
  const encargo = esEncargo(producto);
  // Si el vendedor pide detalles, hay que escribirlos en el detalle del producto.
  const pideDetalles = encargo && Boolean(producto.pide_detalles);
  const agotado = !encargo && stock <= 0;
  const quedan = !encargo && stock > 0 && stock <= 5;
  const nombrePuesto = puesto?.nombre ?? producto.puesto_nombre;
  const domicilio = puesto ? Boolean(puesto.ofrece_domicilio) : producto.puesto_ofrece_domicilio;
  const calificacion = puesto?.calificacion_promedio ?? producto.puesto_calificacion;
  const unidad = producto.unidad_medida ?? 'unidad';

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  // La ficha arranca con los datos de la tarjeta (abre al instante y se actualiza sola) y la foto «viaja».
  const alAbrirFoto = (evento: MouseEvent<HTMLAnchorElement>) => {
    queryClient.setQueryData(claves.producto(producto.id), (previo) => previo ?? producto, { updatedAt: 0 });
    const aparte = evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey;
    if (aparte) return;
    if (abrirConFotoCompartida(foto.current, () => navigate(`/productos/${producto.id}`))) evento.preventDefault();
  };

  const alAgregar = async () => {
    if (pideDetalles) {
      navigate(`/productos/${producto.id}`);
      return;
    }
    let destino = puesto;
    if (!destino) {
      setAgregando(true);
      try {
        destino = await obtenerPuesto(producto.id_puesto);
      } catch (error) {
        toast.error(mensajeDeError(error, 'No pudimos consultar el puesto.'));
        setAgregando(false);
        return;
      } finally {
        setAgregando(false);
      }
    }
    if (!destino) return;
    const resultado = agregar(producto, destino);
    if (resultado === 'otro_puesto') {
      toast.info('Tu carrito tiene productos de otro puesto. Vacíalo o termina esa compra primero.');
      return;
    }
    volarAlCarrito(foto.current, urlAbsoluta(producto.imagenes?.[0]?.miniatura || producto.imagenes?.[0]?.url));
    toast.exito(`${producto.nombre} se agregó al carrito.`);
    setAgregado(true);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAgregado(false), 1600);
  };

  const icono = agregando ? (
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
  ) : agregado ? (
    <Check className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
  ) : (
    <Plus className="h-[22px] w-[22px]" strokeWidth={2.6} aria-hidden="true" />
  );

  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      <div className="relative">
      <Link
        ref={foto}
        to={`/productos/${producto.id}`}
        onClick={alAbrirFoto}
        className="relative block aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800"
        aria-label={producto.nombre}
      >
        <ImagenProducto
          producto={producto}
          categoria={categoria}
          prioridad={prioridad}
          cargaInmediata={cargaInmediata}
          className="h-full w-full"
        />
        {encargo ? (
          <span className="absolute left-2 top-2 rounded-[5px] bg-white px-[7px] py-[3px] text-xs font-bold text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-200">
            Por encargo · {formatearPreparacion(producto.preparacion_horas ?? 0)}
          </span>
        ) : agotado ? (
          <span className="absolute left-2 top-2 rounded-[5px] bg-tinta px-[7px] py-[3px] text-xs font-bold text-white">
            Agotado
          </span>
        ) : (
          quedan && (
            <span className="absolute left-2 top-2 rounded-[5px] bg-white px-[7px] py-[3px] text-xs font-bold text-[#A62F11] shadow-sm dark:bg-slate-900 dark:text-[#F2967C]">
              Quedan {stock}
            </span>
          )
        )}
      </Link>

      {/* Móvil: botón + redondo sobre la foto. */}
      <button
        type="button"
        onClick={() => void alAgregar()}
        disabled={agotado || agregando}
        aria-label={pideDetalles ? `Encargar ${producto.nombre}` : `Agregar ${producto.nombre} al carrito`}
        className={`absolute bottom-2 right-2 z-10 grid h-11 w-11 place-items-center rounded-full text-white shadow-[0_2px_7px_rgba(0,0,0,.28)] transition active:scale-90 disabled:opacity-50 md:hidden ${
          agregado ? 'bg-exito' : 'bg-accion'
        }`}
      >
        {icono}
      </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-[11px] pb-3 pt-[9px] md:px-[13px] md:pb-[13px] md:pt-3">
        <p className="precio whitespace-nowrap text-xl md:text-[21px] xl:text-[23px]">
          {formatearMoneda(producto.precio)}{' '}
          <small className="text-xs font-medium tracking-normal text-slate-500 md:text-[13px] dark:text-slate-400">
            / {unidad}
          </small>
        </p>
        <Link
          to={`/productos/${producto.id}`}
          className="line-clamp-2 min-h-[2.4rem] text-sm leading-[1.3] text-tinta transition-colors hover:text-brand-600 md:min-h-[39px] md:text-[15px] dark:text-slate-100 dark:hover:text-brand-300"
        >
          {producto.nombre}
        </Link>
        <p className="flex items-center gap-1 text-xs text-slate-500 md:text-[13px] dark:text-slate-400">
          {nombrePuesto && (
            <Link to={`/puestos/${producto.id_puesto}`} className="min-w-0 truncate hover:text-brand-600 hover:underline dark:hover:text-brand-300">
              {nombrePuesto}
            </Link>
          )}
          {calificacion ? (
            <span className="shrink-0 font-bold text-estrella dark:text-amber-400">
              {nombrePuesto && <span className="font-normal text-slate-500 dark:text-slate-400">· </span>}★ {calificacion.toFixed(1)}
            </span>
          ) : null}
        </p>
        {domicilio !== undefined && (
          <p
            className={`flex items-center gap-1 text-xs font-semibold md:text-[13px] ${
              domicilio ? 'text-exito dark:text-[#6FD596]' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {domicilio && <Truck className="h-3.5 w-3.5" aria-hidden="true" />}
            {domicilio ? 'Domicilio disponible' : 'Retiro en el puesto'}
          </p>
        )}
        {/* Escritorio: botón con texto, como el mock. */}
        <button
          type="button"
          onClick={() => void alAgregar()}
          disabled={agotado || agregando}
          aria-label={pideDetalles ? `Encargar ${producto.nombre}` : `Agregar ${producto.nombre} al carrito`}
          className={`mt-2 hidden min-h-[44px] items-center justify-center gap-2 rounded-[7px] border-[1.5px] text-sm font-bold transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 md:flex ${
            agregado
              ? 'border-exito bg-exito text-white'
              : 'border-brand-600 bg-white text-brand-600 hover:bg-brand-600 hover:text-white dark:border-brand-300 dark:bg-transparent dark:text-brand-200 dark:hover:bg-brand-300 dark:hover:text-slate-950'
          }`}
        >
          {agregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {agotado ? 'Agotado' : agregado ? 'Agregado' : pideDetalles ? 'Encargar' : 'Agregar al carrito'}
        </button>
      </div>
    </article>
  );
}
