import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

/** Contador del carrito: rebota cuando suben los productos (después de que llega el vuelo). */
export function ContadorCarrito({ total, className }: { total: number; className?: string }) {
  const anterior = useRef(total);
  const [rebota, setRebota] = useState(0);

  useEffect(() => {
    if (total > anterior.current) setRebota((n) => n + 1);
    anterior.current = total;
  }, [total]);

  if (total <= 0) return null;
  return (
    <span
      key={rebota}
      aria-hidden="true"
      className={cn(
        'grid h-[19px] min-w-[19px] place-items-center rounded-full bg-amarillo px-[5px] text-xs font-extrabold text-tinta',
        rebota > 0 && 'animate-pop [animation-delay:.62s]',
        className,
      )}
    >
      {total > 99 ? '99+' : total}
    </span>
  );
}
