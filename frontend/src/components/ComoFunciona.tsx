import type { CSSProperties } from 'react';
import { PackageCheck, Star, Store } from 'lucide-react';
import { lugar, Revela } from './Revela';
import { OlaTendida } from './ui/Decoracion';
import { TituloSeccion } from './ui/TituloSeccion';

const PASOS = [
  { icono: Store, titulo: 'Elige un puesto', texto: 'Cada pedido es de un solo puesto: sabes quién lo prepara y a quién preguntarle.' },
  { icono: PackageCheck, titulo: 'Sigue tu pedido', texto: 'Lo ves paso a paso, desde el puesto hasta tus manos.' },
  { icono: Star, titulo: 'Opina al recibirlo', texto: 'Solo opina quien recibió su pedido.' },
];

/**
 * Cómo funciona, en tres pasos unidos por una ola que se traza al llegar a la sección; cada paso aparece con un pequeño
 * rebote, uno tras otro (`.paso-pop` y `.ola-recorrido`, index.css). Es lo mismo que decía la frase de antes, pero se ve.
 */
export function ComoFunciona() {
  return (
    <Revela as="section" aria-label="Cómo funciona" className="mx-auto mt-14 max-w-[1240px] px-3 md:mt-20 md:px-5">
      <div className="rv mb-8">
        <TituloSeccion texto="Cómo funciona" />
      </div>
      <div className="relative">
        {/* La ola que une los tres pasos (solo donde van en fila). */}
        <OlaTendida className="ola-recorrido pointer-events-none absolute left-[16.7%] top-[21px] hidden w-[66.6%] text-brand-300 md:block dark:text-brand-500" />
        <ol className="relative grid gap-9 md:grid-cols-3 md:gap-6">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo} className="flex gap-4 md:flex-col md:items-center md:text-center" style={lugar(i) as CSSProperties}>
              <span className="paso-pop grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-flota ring-[6px] ring-fondo dark:bg-brand-500 dark:ring-slate-950">
                <Icono className="h-[22px] w-[22px]" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div className="md:max-w-[17rem]">
                <h3 className="text-base font-bold">{titulo}</h3>
                <p className="mt-1 text-[15px] leading-snug text-slate-600 dark:text-slate-300">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Revela>
  );
}
