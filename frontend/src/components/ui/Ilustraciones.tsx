import { cn } from '../../lib/utils';

/**
 * Ilustraciones propias de los estados sin contenido. Trazo de 2,5 px con las puntas redondas, los colores de la
 * marca (turquesa para la estructura, coral solo en un detalle) y `currentColor` para que sigan al tema. Son
 * decorativas (`aria-hidden`): el texto que las acompaña dice lo mismo.
 */

const BASE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Canasta de mimbre vacía con una hoja que cae: el carrito sin productos. */
export function CanastaVacia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -14 160 138" aria-hidden="true" focusable="false" className={cn('h-[104px] w-auto text-brand-600 dark:text-brand-300', className)}>
      {/* Asa */}
      <path d="M44 52C44 14 116 14 116 52" {...BASE} />
      {/* Cuerpo y tejido */}
      <path d="M26 52h108l-12 56a8 8 0 0 1-8 6H46a8 8 0 0 1-8-6z" {...BASE} className="fill-brand-50 dark:fill-slate-800" />
      <path d="M34 72h92M40 92h80" {...BASE} strokeWidth={2} opacity={0.55} />
      <path d="M62 52l-4 62M80 52v62M98 52l4 62" {...BASE} strokeWidth={2} opacity={0.55} />
      {/* Hoja que cae hacia la canasta */}
      <g className="hoja-cae" style={{ transformOrigin: '80px 20px' }}>
        <path d="M80 6c-9 3-13 11-9 20 9-1 15-8 9-20z" fill="#CF3F1B" stroke="none" opacity={0.95} />
        <path d="M80 8c-3 6-5 11-6 16" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.7} />
      </g>
    </svg>
  );
}

/** Puesto con el toldo recogido y un cartel que se balancea: la página que no existe. */
export function PuestoCerrado({ className }: { className?: string }) {
  const franjas = Array.from({ length: 6 });
  return (
    <svg viewBox="0 0 220 168" aria-hidden="true" focusable="false" className={cn('h-[148px] w-auto text-brand-600 dark:text-brand-300', className)}>
      {/* Postes y mostrador */}
      <path d="M34 34v122M186 34v122" {...BASE} />
      <path d="M22 156h176" {...BASE} />
      <path d="M34 118h152v38H34z" {...BASE} className="fill-brand-50 dark:fill-slate-800" />
      <path d="M52 118v38M110 118v38M168 118v38" {...BASE} strokeWidth={2} opacity={0.45} />
      {/* Toldo recogido: franjas cortas y festón */}
      {franjas.map((_, i) => {
        const x = 26 + i * 28;
        return <path key={i} d={`M${x} 22h28v14a14 14 0 0 1 -28 0z`} fill={i % 2 === 0 ? '#CF3F1B' : '#FFF4DC'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />;
      })}
      {/* Cartel colgado de dos cuerdas, que se balancea */}
      <g className="cartel-balancea" style={{ transformOrigin: '110px 44px' }}>
        <path d="M84 62l26-20 26 20" {...BASE} strokeWidth={1.8} />
        <rect x="58" y="62" width="104" height="38" rx="6" className="fill-white stroke-current dark:fill-slate-900" strokeWidth={2.5} />
        <text x="110" y="85" textAnchor="middle" fontSize="14" fontWeight="800" letterSpacing="1.2" className="fill-[#CF3F1B] dark:fill-[#F2967C]" stroke="none">
          CERRADO
        </text>
      </g>
    </svg>
  );
}
