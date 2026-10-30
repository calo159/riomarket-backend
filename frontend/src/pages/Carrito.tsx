import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { formatearMoneda } from '../lib/format';
import { Imagen } from '../components/Imagen';
import { LogoPuesto } from '../components/PuestoCard';
import { EncabezadoPagina } from '../components/ui/Encabezado';
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
    document.title = 'Carrito · RioMarket';
  }, []);

  if (!carrito || carrito.items.length === 0) {
    return (
      <div className="mx-auto max-w-[1240px] px-3 py-6 sm:px-5">
        <EncabezadoPagina titulo="Tu carrito" />
        <EstadoVacio
          titulo="Tu carrito está vacío"
          descripcion="Explora el catálogo y agrega productos de tus vendedores favoritos."
          icono={<ShoppingCart className="h-9 w-9" />}
          accion={<Link to="/catalogo" className="btn-primary">Ir al catálogo</Link>}
        />
      </div>
    );
  }

  const vaciarCarrito = () => {
    vaciar();
    setConfirmarVaciar(false);
    toast.info('Carrito vaciado.');
  };

  return (
    <div className="mx-auto max-w-[1240px] px-3 pb-28 pt-5 sm:px-5 lg:pb-8">
      <EncabezadoPagina
        titulo="Tu carrito"
        descripcion={`${totalItems} ${totalItems === 1 ? 'producto' : 'productos'} · Pedido a ${carrito.puestoNombre}`}
        acciones={
          <button type="button" className="btn-ghost text-rose-700 dark:text-rose-400" onClick={() => setConfirmarVaciar(true)}>
            <Trash2 className="h-4 w-4" /> Vaciar
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Link to={`/puestos/${carrito.puestoId}`} className="card flex items-center gap-3 p-3.5 font-bold text-tinta hover:text-brand-600 dark:text-slate-100">
            <LogoPuesto nombre={carrito.puestoNombre} className="h-10 w-10 text-sm" />
            <span className="min-w-0"><span className="block truncate">{carrito.puestoNombre}</span><span className="text-[13px] font-normal text-slate-500 dark:text-slate-400">{carrito.ofreceDomicilio ? 'Domicilio o retiro' : 'Retiro en el puesto'}</span></span>
          </Link>
          {carrito.items.map((item) => (
            <article key={item.productoId} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
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
                    <Link to={`/productos/${item.productoId}`} className="line-clamp-2 font-semibold hover:underline">
                      {item.nombre}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatearMoneda(item.precio)} / {item.unidadMedida}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(item.productoId)}
                    className="btn-ghost shrink-0 !min-h-[44px] !min-w-[44px] p-2 text-slate-500 hover:text-rose-700"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="inline-flex items-center overflow-hidden rounded-[7px] border border-slate-300 dark:border-slate-600">
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 dark:text-brand-200 dark:hover:bg-slate-800"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)}
                      aria-label="Quitar una unidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold tabular-nums" aria-live="polite">{item.cantidad}</span>
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 dark:text-brand-200 dark:hover:bg-slate-800"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stock}
                      aria-label="Agregar una unidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="precio text-lg">{formatearMoneda(Number(item.precio) * item.cantidad)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="card hidden h-fit p-5 lg:sticky lg:top-4 lg:block">
          <h2 className="text-xl font-bold">Resumen de compra</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
              <span className="font-medium">{formatearMoneda(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Puesto</span>
              <Link to={`/puestos/${carrito.puestoId}`} className="max-w-[12rem] truncate font-medium hover:underline">
                {carrito.puestoNombre}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Entrega</span>
              <span className="font-medium">{carrito.ofreceDomicilio ? 'Retiro o domicilio' : 'Retiro en el puesto'}</span>
            </div>
          </div>
          <div className="my-4 border-t" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total estimado</span>
            <span className="precio text-2xl">{formatearMoneda(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            El domicilio y los cupones se calculan en el siguiente paso.
          </p>
          <button type="button" className="btn-primary mt-4 min-h-[48px] w-full text-base" onClick={() => navigate('/checkout')}>
            Continuar con la compra
          </button>
          <Link to="/catalogo" className="btn-ghost mt-2 w-full">Seguir comprando</Link>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2.5 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total estimado</p>
          <p className="precio text-xl">{formatearMoneda(subtotal)}</p>
        </div>
        <button type="button" className="btn-primary min-h-[48px] px-6 text-base" onClick={() => navigate('/checkout')}>
          Continuar con la compra
        </button>
      </div>

      <ConfirmarModal
        abierto={confirmarVaciar}
        titulo="¿Vaciar el carrito?"
        descripcion="Se quitarán todos los productos que agregaste."
        textoConfirmar="Vaciar carrito"
        onConfirmar={vaciarCarrito}
        onCerrar={() => setConfirmarVaciar(false)}
      />
    </div>
  );
}
