import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin', className)} aria-hidden="true" />;
}

export function CargandoPantalla({ mensaje = 'Cargando RioMarket…' }: { mensaje?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
      <Spinner className="h-8 w-8 text-brand-600" />
      <p className="text-sm font-medium">{mensaje}</p>
    </div>
  );
}

export function CargandoBloque({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
      <Spinner /> {mensaje}
    </div>
  );
}

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 px-5 py-8 dark:border-slate-600 sm:px-8">
      <h2 className="text-lg font-extrabold">{titulo}</h2>
      {descripcion && <p className="mt-1 max-w-md text-sm text-slate-700 dark:text-slate-300">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function EstadoError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border-2 border-rojo-600 bg-white p-5 text-slate-900 dark:border-rojo-400 dark:bg-slate-900 dark:text-slate-100">
      <p className="font-extrabold text-rojo-700 dark:text-rojo-300">No pudimos cargar esta sección</p>
      <p className="mt-1 text-sm">{mensaje}</p>
      {onReintentar && (
        <button type="button" className="btn-secondary mt-3" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

function EsqueletoTarjeta() {
  return (
    <div>
      <div className="skeleton aspect-square w-full rounded-lg" />
      <div className="skeleton mt-2 h-6 w-1/2" />
      <div className="skeleton mt-2 h-4 w-4/5" />
    </div>
  );
}

export function EsqueletoGrid({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: cantidad }).map((_, indice) => (
        <EsqueletoTarjeta key={indice} />
      ))}
    </div>
  );
}
