import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { formatearMoneda } from '../lib/format';
import { Imagen } from '../components/Imagen';
import { EstadoVacio } from '../components/ui/Estado';
import { ConfirmarModal } from '../components/ui/Modal';
import { useState } from 'react';
import { useToast } from '../components/ui/Toast';

export function Carrito() {
  const { carrito, totalItems, subtotal, cambiarCantidad, quitar, vaciar } = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);

  useEffect(() => {
    document.title = 'Canasta · RioMarket';
  }, []);

  if (!carrito || carrito.items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-5 text-3xl sm:text-4xl">Tu canasta</h1>
        <EstadoVacio
          titulo="Tu canasta está vacía"
          descripcion="Elige un producto del catálogo y agrégalo con el botón +."
          accion={<Link to="/catalogo" className="btn-primary">Ir al catálogo</Link>}
        />
      </div>
    );
  }

  const vaciarCarrito = () => {
    vaciar();
    setConfirmarVaciar(false);
    toast.info('Canasta vaciada.');
  };

  const continuar = () => navigate('/checkout');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tnum text-sm text-slate-700 dark:text-slate-300">
            Tu canasta · {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </p>
          <h1 className="text-3xl leading-tight sm:text-4xl">
            <Link to={`/puestos/${carrito.puestoId}`} className="hover:underline">{carrito.puestoNombre}</Link>
          </h1>
        </div>
        <button type="button" className="btn-ghost shrink-0 text-rojo-700 dark:text-rojo-300" onClick={() => setConfirmarVaciar(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Vaciar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y border-y">
          {carrito.items.map((item) => (
            <li key={item.productoId} className="flex gap-3 py-3 sm:gap-4">
              <Link to={`/productos/${item.productoId}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28">
                <Imagen
                  src={item.imagen}
                  fallbackNombre={item.nombre}
                  contenedorClassName="h-full w-full"
                  alt={item.nombre}
                  width={112}
                  height={112}
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/productos/${item.productoId}`} className="line-clamp-2 font-medium hover:underline">
                      {item.nombre}
                    </Link>
                    <p className="tnum mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                      {formatearMoneda(item.precio)} / {item.unidadMedida}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(item.productoId)}
                    className="btn-ghost -mr-2 -mt-1 h-11 w-11 shrink-0 p-0 text-slate-700 hover:text-rojo-700 dark:text-slate-300"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="inline-flex items-center rounded-lg border-2 border-slate-900 dark:border-slate-300">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)}
                      aria-label="Quitar una unidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="tnum w-8 text-center text-sm font-bold">{item.cantidad}</span>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stock}
                      aria-label="Agregar una unidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="tnum text-lg font-extrabold">{formatearMoneda(Number(item.precio) * item.cantidad)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="hidden h-fit rounded-xl border-2 border-slate-900 p-5 dark:border-slate-300 lg:sticky lg:top-24 lg:block">
          <h2 className="text-lg">Resumen</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-slate-300">Subtotal</span>
              <span className="tnum font-medium">{formatearMoneda(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-slate-300">Entrega</span>
              <span className="font-medium">{carrito.ofreceDomicilio ? 'Retiro o domicilio' : 'Retiro en el puesto'}</span>
            </div>
          </div>
          <div className="my-4 border-t" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total estimado</span>
            <span className="tnum text-2xl font-extrabold">{formatearMoneda(subtotal)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            El domicilio y los cupones se calculan en el siguiente paso.
          </p>
          <button type="button" className="btn-primary mt-4 min-h-12 w-full" onClick={continuar}>
            Continuar con la compra
          </button>
          <Link to="/catalogo" className="btn-ghost mt-2 w-full">Seguir comprando</Link>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-slate-950 bg-white px-4 py-3 dark:border-slate-300 dark:bg-slate-950 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-300">Total estimado</p>
            <p className="tnum text-2xl font-extrabold leading-none">{formatearMoneda(subtotal)}</p>
          </div>
          <button type="button" className="btn-primary ml-auto min-h-12 flex-1 sm:flex-none" onClick={continuar}>
            Continuar con la compra
          </button>
        </div>
      </div>

      <ConfirmarModal
        abierto={confirmarVaciar}
        titulo="¿Vaciar la canasta?"
        descripcion="Se quitarán todos los productos que agregaste."
        textoConfirmar="Vaciar canasta"
        onConfirmar={vaciarCarrito}
        onCerrar={() => setConfirmarVaciar(false)}
      />
    </div>
  );
}
