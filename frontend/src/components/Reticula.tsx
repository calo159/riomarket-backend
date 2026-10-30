import { cn } from '../lib/utils';

/** Filas de ranuras redondeadas, como el costado de una canasta. Solo adorno de borde. */
export function Reticula({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('reticula', className)} />;
}
