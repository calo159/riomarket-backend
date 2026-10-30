import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
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
  icono,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      <div className="mb-3 text-slate-400">{icono ?? <Inbox className="h-8 w-8" />}</div>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {descripcion && <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
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
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">No pudimos cargar esta sección</p>
          <p className="mt-1 text-sm">{mensaje}</p>
          {onReintentar && (
            <button type="button" className="btn-secondary mt-3" onClick={onReintentar}>
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EsqueletoTarjeta() {
  return (
    <div className="card overflow-hidden p-4">
      <div className="skeleton mb-4 h-40 w-full" />
      <div className="skeleton mb-2 h-4 w-3/4" />
      <div className="skeleton mb-2 h-3 w-1/2" />
      <div className="skeleton h-5 w-1/3" />
    </div>
  );
}

export function EsqueletoGrid({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, indice) => (
        <EsqueletoTarjeta key={indice} />
      ))}
    </div>
  );
}
