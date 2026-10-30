import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

/** Marca: una canasta con su asa y sus ranuras (huecos del trazo). */
export function MarcaCanasta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path fillRule="evenodd" d="M6 6h20a4 4 0 0 1 4 4v14a4 4 0 0 1 -4 4h-20a4 4 0 0 1 -4 -4v-14a4 4 0 0 1 4 -4zM13 9h6a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-0a2 2 0 0 1 2 -2zM8 16h5a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-0a2 2 0 0 1 2 -2zM19 16h5a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-0a2 2 0 0 1 2 -2zM7.5 22h6a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1 -1.5 1.5h-6a1.5 1.5 0 0 1 -1.5 -1.5v-0a1.5 1.5 0 0 1 1.5 -1.5zM18.5 22h6a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1 -1.5 1.5h-6a1.5 1.5 0 0 1 -1.5 -1.5v-0a1.5 1.5 0 0 1 1.5 -1.5z" />
    </svg>
  );
}

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <Link
      to="/"
      className={cn('inline-flex items-center gap-1.5 rounded-lg text-brand-600 dark:text-brand-300', className)}
      aria-label="RioMarket, ir al inicio"
    >
      <MarcaCanasta className="h-8 w-8" />
      {!compacto && <span className="text-xl font-extrabold tracking-tight">RioMarket</span>}
    </Link>
  );
}
