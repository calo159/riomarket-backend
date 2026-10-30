import { IconoCategoria } from './iconos';

/** Reserva sin foto: fondo gris claro con el icono de la categoría (o uno genérico). */
export function ReservaImagen({
  nombre = '',
  categoria,
  className = '',
}: {
  nombre?: string;
  categoria?: string | null;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={nombre ? `${nombre}, sin foto` : 'Sin foto'}
      className={`flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 ${className}`}
    >
      <IconoCategoria nombre={categoria} className="h-1/3 w-1/3 max-h-16 max-w-16 min-h-6 min-w-6" />
    </div>
  );
}
