import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Paginacion({
  pagina,
  total,
  tamano,
  onCambiar,
  cargando,
}: {
  pagina: number;
  total: number;
  tamano: number;
  onCambiar: (pagina: number) => void;
  cargando?: boolean;
}) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  if (paginas <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginación">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1 || cargando}
      >
        <ChevronLeft className="h-4 w-4" /> Anterior
      </button>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Página <strong className="text-slate-800 dark:text-slate-200">{pagina}</strong> de {paginas}
      </p>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= paginas || cargando}
      >
        Siguiente <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
