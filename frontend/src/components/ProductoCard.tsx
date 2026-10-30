import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import type { Producto, Puesto } from '../lib/types';
import { formatearMoneda } from '../lib/format';
import { urlAbsoluta } from '../lib/utils';
import { useCart } from '../cart/CartProvider';
import { useToast } from './ui/Toast';
import { obtenerPuesto } from '../api/catalog';
import { mensajeDeError } from '../lib/errors';
import { Imagen } from './Imagen';

export function ImagenProducto({
  producto,
  className,
}: {
  producto: Producto;
  className?: string;
}) {
  const img0 = producto.imagenes?.[0];
  const url = urlAbsoluta(img0?.url || img0?.miniatura);
  return (
    <Imagen
      src={url}
      fallbackNombre={producto.nombre}
      categoriaId={producto.id_categoria}
      contenedorClassName={className}
      alt={img0?.alt || producto.nombre}
      width={img0?.ancho ?? undefined}
      height={img0?.alto ?? undefined}
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
      toast.info('Tu canasta tiene productos de otro puesto. Vacíala o termina esa compra primero.');
      return;
    }
    toast.exito(`${producto.nombre} se agregó a la canasta.`);
  };

  return (
    <article className="flex flex-col">
      <div className="relative">
        <Link to={`/productos/${producto.id}`} className="block aspect-square overflow-hidden rounded-lg" tabIndex={-1} aria-hidden="true">
          <ImagenProducto producto={producto} className="h-full w-full" />
        </Link>
        <button
          type="button"
          onClick={() => void alAgregar()}
          disabled={agotado || agregando}
          className="btn-primary absolute bottom-2 right-2 h-11 w-11 p-0 disabled:opacity-100 disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
          aria-label={`Agregar ${producto.nombre} a la canasta`}
          title={agotado ? 'Agotado' : 'Agregar a la canasta'}
        >
          {agregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>
      <p className="tnum mt-2 text-xl font-extrabold leading-tight">
        {formatearMoneda(producto.precio)}
        <span className="ml-1 whitespace-nowrap text-sm font-normal text-slate-600 dark:text-slate-400">
          / {producto.unidad_medida ?? 'unidad'}
        </span>
      </p>
      <Link to={`/productos/${producto.id}`} className="mt-0.5 line-clamp-2 font-medium leading-snug hover:underline">
        {producto.nombre}
      </Link>
      {puesto && (
        <Link
          to={`/puestos/${puesto.id}`}
          className="mt-0.5 line-clamp-1 text-sm text-slate-600 hover:underline dark:text-slate-400"
        >
          {puesto.nombre}
        </Link>
      )}
      {agotado && <p className="mt-1 text-sm font-semibold text-rojo-700 dark:text-rojo-300">Agotado</p>}
    </article>
  );
}
