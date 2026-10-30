import { colorEstado, etiquetaEstado } from '../../lib/format';
import { cn } from '../../lib/utils';

export function EtiquetaEstado({ estado, className }: { estado: string | null | undefined; className?: string }) {
  return (
    <span className={cn('badge first-letter:uppercase', colorEstado(estado), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {etiquetaEstado(estado)}
    </span>
  );
}
