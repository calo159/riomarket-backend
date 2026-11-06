import { lugar, Revela } from './Revela';

const PASOS = [
  { lead: 'Eliges un puesto.', texto: 'Sabes quién prepara tu pedido y a quién preguntarle.' },
  { lead: 'Sigues tu pedido.', texto: 'Paso a paso, desde el puesto hasta tus manos.' },
  { lead: 'Opinas al recibirlo.', texto: 'Solo opina quien recibió su pedido.' },
];

/**
 * Cómo funciona, dicho como lo diría alguien en el puesto: una frase grande en la tipografía de rótulo y, al lado, tres
 * líneas. Sin iconos en círculos ni tarjetas: es texto que se lee, con las líneas finas de una libreta.
 */
export function ComoFunciona() {
  return (
    <Revela as="section" aria-label="Cómo funciona" className="mx-auto mt-16 max-w-[1240px] px-3 md:mt-24 md:px-5">
      <div className="grid items-start gap-7 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <h2 className="rv font-display text-[30px] font-normal leading-[1.1] [font-synthesis:none] [text-wrap:balance] md:text-[42px]">
          Cada pedido sale de un solo puesto.
        </h2>
        <ol className="border-t border-slate-300 dark:border-slate-700">
          {PASOS.map(({ lead, texto }, i) => (
            <li key={lead} className="rv border-b border-slate-300 py-4 text-[16px] leading-snug dark:border-slate-700" style={lugar(i + 1)}>
              <b className="font-bold">{lead}</b> <span className="text-slate-600 dark:text-slate-300">{texto}</span>
            </li>
          ))}
        </ol>
      </div>
    </Revela>
  );
}
