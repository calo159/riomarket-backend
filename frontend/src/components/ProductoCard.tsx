import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, Loader2, Plus, ShoppingBasket } from 'lucide-react';
import type { Producto, Puesto } from '../lib/types';
import { formatearMoneda } from '../lib/format';
import { urlAbsoluta } from '../lib/utils';
import { useCart } from '../cart/CartProvider';
import { useToast } from './ui/Toast';
import { obtenerPuesto } from '../api/catalog';
import { mensajeDeError } from '../lib/errors';

export function ImagenProducto({
  producto,
  className,
}: {
  producto: Producto;
  className?: string;
}) {
  const url = urlAbsoluta(producto.imagenes?.[0]?.url);
  if (!url) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-700">
          <ImageOff className="h-10 w-10" />
        </div>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={producto.nombre}
      loading="lazy"
      className={className}
    />
  );
}

export function ProductoCard({ producto, puesto }: { producto: Producto; puesto?: Puesto }) {
  const { agregar } = useCart();
  const toast = useToast();
  const [agregando, setAgregando] = useState(false);
  const agotado = (producto.stock ?? 0) <= 0;

  const alAgregar = async () => {
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
    toast.exito(`${producto.nombre} se agregó al carrito.`);
  };

  return (
    <article className="card group flex flex-col overflow-hidden">
      <Link to={`/productos/${producto.id}`} className="relative block aspect-[4/3] overflow-hidden">
        <ImagenProducto
          producto={producto}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-200">
          {producto.unidad_medida ?? 'unidad'}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/productos/${producto.id}`} className="line-clamp-2 font-semibold hover:underline">
          {producto.nombre}
        </Link>
        {puesto && (
          <Link
            to={`/puestos/${puesto.id}`}
            className="mt-1 line-clamp-1 text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            {puesto.nombre}
          </Link>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-lg font-bold text-brand-800 dark:text-brand-300">
              {formatearMoneda(producto.precio)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {agotado ? 'Agotado' : `${producto.stock ?? 0} disponibles`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void alAgregar()}
            disabled={agotado || agregando}
            className="btn-primary h-10 w-10 shrink-0 rounded-full p-0"
            aria-label={`Agregar ${producto.nombre} al carrito`}
            title="Agregar al carrito"
          >
            {agotado ? (
              <ShoppingBasket className="h-4 w-4" />
            ) : agregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
