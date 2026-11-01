import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { desvanecerEnMancha, PatronOlas } from './Decoracion';

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
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-brand-50/60 px-6 py-14 text-center dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
      <PatronOlas className="text-brand-600 opacity-[.07] dark:text-white dark:opacity-[.04]" style={desvanecerEnMancha('50% 100%', 80, 100)} />
      <div className="relative mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600 ring-8 ring-brand-50/70 dark:bg-slate-800 dark:text-brand-300 dark:ring-slate-800/60">{icono ?? <Inbox className="h-7 w-7" />}</div>
      <h2 className="relative text-lg font-bold">{titulo}</h2>
      {descripcion && <p className="relative mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>}
      {accion && <div className="relative mt-5">{accion}</div>}
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
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
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

/** Esqueleto con la forma real de la tarjeta de producto: foto cuadrada, precio, nombre, puesto. */
function EsqueletoTarjeta() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="skeleton aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-6 w-2/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/5" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton mt-3 h-10 w-full" />
      </div>
    </div>
  );
}

export function EsqueletoGrid({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Cargando productos">
      {Array.from({ length: cantidad }).map((_, indice) => (
        <EsqueletoTarjeta key={indice} />
      ))}
    </div>
  );
}
