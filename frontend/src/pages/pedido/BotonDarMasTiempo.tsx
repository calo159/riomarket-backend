import { Clock, Loader2 } from 'lucide-react';
import type { Pedido } from '../../lib/types';

interface Props {
  pedido: Pick<Pedido, 'horas_extension' | 'acciones_permitidas'>;
  cargando: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * «Dar N h más»: el vendedor (o el administrador) amplía el plazo de un retiro.
 * Solo se muestra si el backend lo permite (`extender-plazo`); el límite de 2 veces lo decide él.
 */
export function BotonDarMasTiempo({ pedido, cargando, onClick, className = 'btn-secondary' }: Props) {
  if (!pedido.acciones_permitidas?.includes('extender-plazo')) return null;
  const horas = pedido.horas_extension ?? 24;
  return (
    <button type="button" className={className} onClick={onClick} disabled={cargando}>
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} Dar {horas} h más
    </button>
  );
}
