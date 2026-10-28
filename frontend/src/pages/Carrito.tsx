import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { formatearMoneda } from '../lib/format';
import { Imagen } from '../components/Imagen';
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
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <EncabezadoPagina
        titulo="Tu carrito"
        descripcion={`${totalItems} ${totalItems === 1 ? 'producto' : 'productos'} de ${carrito.puestoNombre}.`}
        acciones={
          <button type="button" className="btn-ghost text-rose-600 dark:text-rose-400" onClick={() => setConfirmarVaciar(true)}>
            <Trash2 className="h-4 w-4" /> Vaciar
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {carrito.items.map((item) => (
            <article key={item.productoId} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
              <Link to={`/productos/${item.productoId}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
                <Imagen
                  src={item.imagen}
                  fallbackNombre={item.nombre}
                  contenedorClassName="h-full w-full"
                  alt={item.nombre}
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
                    className="btn-ghost shrink-0 p-2 text-slate-500 hover:text-rose-600"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="inline-flex items-center rounded-lg border">
                    <button
                      type="button"
                      className="p-2 text-slate-600 disabled:opacity-40 dark:text-slate-300"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)}
                      aria-label="Quitar una unidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                    <button
                      type="button"
                      className="p-2 text-slate-600 disabled:opacity-40 dark:text-slate-300"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stock}
                      aria-label="Agregar una unidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="font-bold">{formatearMoneda(Number(item.precio) * item.cantidad)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Resumen de compra</h2>
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
            <span className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{formatearMoneda(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            El domicilio y los cupones se calculan en el siguiente paso.
          </p>
          <button type="button" className="btn-primary mt-4 w-full py-3" onClick={() => navigate('/checkout')}>
            Continuar con la compra
          </button>
          <Link to="/catalogo" className="btn-ghost mt-2 w-full">Seguir comprando</Link>
        </aside>
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
