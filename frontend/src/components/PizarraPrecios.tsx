import { Link } from 'react-router-dom';
import type { Producto } from '../lib/types';
import { formatearMoneda } from '../lib/format';

function Fila({ productos, copia }: { productos: Producto[]; copia?: boolean }) {
  return (
    <ul
      className={copia ? 'pizarra-copia flex shrink-0 items-center' : 'flex shrink-0 items-center'}
      aria-hidden={copia ? true : undefined}
    >
      {productos.map((p) => (
        <li key={p.id} className="flex shrink-0 items-center">
          <Link
            to={`/productos/${p.id}`}
            tabIndex={copia ? -1 : undefined}
            className="group flex items-center gap-2.5 rounded-md px-1 py-1 text-sm font-medium text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-200 dark:hover:text-brand-200"
          >
            <span className="whitespace-nowrap">{p.nombre}</span>
            <span className="precio-mini precio whitespace-nowrap text-[13px]">
              {formatearMoneda(p.precio)}
              <span className="font-medium"> / {p.unidad_medida ?? 'unidad'}</span>
            </span>
          </Link>
          <svg viewBox="0 0 24 8" aria-hidden="true" focusable="false" className="mx-5 h-2 w-6 shrink-0 text-brand-300 dark:text-brand-500">
            <path d="M1 5q5.5-6 11 0t11 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </li>
      ))}
    </ul>
  );
}

/**
 * Cinta de precios: lo que hay en los puestos, con su precio en una etiquetita, pasando despacio como el pregón de un
 * mercado. Se detiene al pasar el cursor o enfocar un producto; con «reducir movimiento» no se mueve (se puede recorrer
 * con el desplazamiento) y se oculta la copia que cierra el bucle. Son enlaces reales a cada producto.
 */
export function PizarraPrecios({ productos }: { productos: Producto[] }) {
  if (productos.length < 4) return null;
  return (
    <section
      aria-label="Productos y precios de los puestos"
      className="pizarra relative mt-5 overflow-hidden border-y border-slate-200 bg-white/70 py-2 dark:border-slate-800 dark:bg-slate-900/50 md:mt-7"
    >
      <div className="pizarra-pista flex w-max">
        <Fila productos={productos} />
        <Fila productos={productos} copia />
      </div>
    </section>
  );
}
