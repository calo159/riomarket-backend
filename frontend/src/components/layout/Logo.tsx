import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 rounded-lg', className)} aria-label="RioMarket, ir al inicio">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <Store className="h-5 w-5" />
      </span>
      {!compacto && (
        <span className="text-xl font-extrabold tracking-tight">
          Rio<span className="text-brand-600 dark:text-brand-400">Market</span>
        </span>
      )}
    </Link>
  );
}
