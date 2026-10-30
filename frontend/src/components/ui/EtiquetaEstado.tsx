import { colorEstado, etiquetaEstado } from '../../lib/format';
import { cn } from '../../lib/utils';

export function EtiquetaEstado({ estado, className }: { estado: string | null | undefined; className?: string }) {
  return <span className={cn('badge', colorEstado(estado), className)}>{etiquetaEstado(estado)}</span>;
}
