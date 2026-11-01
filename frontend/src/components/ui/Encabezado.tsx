import type { ReactNode } from 'react';
import { desvanecerEnMancha, PatronOlas } from './Decoracion';

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <PatronOlas className="text-brand-600 opacity-[.08] dark:text-white dark:opacity-[.05]" style={desvanecerEnMancha('100% 40%', 50, 150)} />
      <div className="relative">
        <h1 className="text-[22px] font-extrabold tracking-tight sm:text-2xl">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>}
      </div>
      {acciones && <div className="relative flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}