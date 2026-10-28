import { ImageOff } from 'lucide-react';

const COLORES = [
  'from-brand-100 to-brand-200 dark:from-brand-950 dark:to-brand-900',
  'from-sand-100 to-sand-200 dark:from-slate-800 dark:to-slate-900',
  'from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-900',
  'from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900',
  'from-cyan-100 to-cyan-200 dark:from-cyan-950 dark:to-cyan-900',
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function ReservaImagen({
  nombre,
  className = '',
}: {
  nombre: string;
  className?: string;
}) {
  const idx = hash(nombre || 'riomarket') % COLORES.length;
  const iniciales = (nombre || 'RM')
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || '')
    .join('');
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${COLORES[idx]} ${className}`}
    >
      <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300">
        <ImageOff className="h-10 w-10" />
        {iniciales && <span className="text-lg font-bold">{iniciales}</span>}
      </div>
    </div>
  );
}
