import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useSitio } from '../../lib/sitio';
import { MarcaSvg } from './MarcaSvg';

/**
 * Parte el nombre de la marca en dos para pintar la segunda mitad en otro color: por las mayúsculas internas
 * («RioMarket» → «Rio» + «Market»), por un espacio («Mercado Sol» → «Mercado» + «Sol») o, si no hay dónde, por la mitad.
 */
export function partirNombre(nombre: string): [string, string] {
  const limpio = nombre.trim();
  const mayuscula = limpio.slice(1).search(/[A-ZÁÉÍÓÚÑ]/);
  if (mayuscula >= 0) return [limpio.slice(0, mayuscula + 1), limpio.slice(mayuscula + 1)];
  const espacio = limpio.indexOf(' ');
  if (espacio > 0) return [limpio.slice(0, espacio + 1), limpio.slice(espacio + 1)];
  const mitad = Math.ceil(limpio.length / 2);
  return [limpio.slice(0, mitad), limpio.slice(mitad)];
}

/** Marca del sitio: el símbolo (toldo sobre el río) y el nombre que fijó el administrador, en dos colores. */
export function Logo({
  className,
  sobreMarca = false,
}: {
  className?: string;
  /** compacto se conserva por compatibilidad: ya no hay icono aparte. */
  compacto?: boolean;
  /** true cuando va sobre el encabezado de la marca o el pie oscuro. */
  sobreMarca?: boolean;
}) {
  const { nombre_marca: nombre } = useSitio();
  const [inicio, final] = partirNombre(nombre);
  return (
    <Link
      to="/tienda"
      className={cn(
        'inline-flex items-center gap-[0.3em] rounded-lg text-[27px] font-extrabold tracking-[-0.03em]',
        sobreMarca ? 'text-white hover:text-white' : 'text-brand-600 dark:text-white',
        className,
      )}
      aria-label={`${nombre}, ir al inicio`}
    >
      <MarcaSvg conFondo={!sobreMarca} className="h-[1.3em] w-[1.3em] shrink-0" />
      <span className="whitespace-pre">
        {inicio}
        <span className={sobreMarca ? 'text-amarillo' : 'text-accion dark:text-amarillo'}>{final}</span>
      </span>
    </Link>
  );
}
