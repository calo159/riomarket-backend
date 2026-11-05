import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../cart/CartProvider';

/**
 * Un pedido es de un solo puesto. Si ya hay productos en el carrito, se dice ANTES de que alguien intente
 * agregar de otro puesto (hoy solo se enteraba por un aviso de error al tocar «Agregar»).
 */
export function AvisoUnPuesto({ className }: { className?: string }) {
  const { carrito } = useCart();
  if (!carrito || carrito.items.length === 0) return null;
  return (
    <p
      role="note"
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100 ${className ?? ''}`}
    >
      <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Tu pedido es de <b>{carrito.puestoNombre}</b>. Cada pedido es de un solo puesto: para pedir en otro, termina o vacía este primero.
      </span>
      <Link to="/carrito" className="link ml-auto text-sm">
        Ver mi pedido
      </Link>
    </p>
  );
}
