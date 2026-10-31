import { useId, useState } from 'react';
import type { VentasDia } from '../../api/payments';
import { formatearDiaMes, formatearMoneda, numero } from '../../lib/format';
import { cn } from '../../lib/utils';

const BASE = 118; // y de la línea base dentro del viewBox (alto 120)
const ALTO = 114; // alto útil de la barra más alta
const PASO = 12; // ancho de cada día en el viewBox
const ANCHO_BARRA = 10; // 2 de separación entre barras

/** Primer valor «redondo» (1, 2, 2.5, 5 × 10ⁿ) que cubre el máximo: el techo del eje. */
export function maximoRedondeado(valor: number): number {
  if (valor <= 0) return 0;
  const base = 10 ** Math.floor(Math.log10(valor));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (factor * base >= valor) return factor * base;
  }
  return 10 * base;
}

function pluralPedidos(n: number): string {
  return `${n} ${n === 1 ? 'pedido' : 'pedidos'}`;
}

/** Barra con las esquinas de arriba apenas redondeadas (2 px); sin píldoras. */
function trazoBarra(x: number, alto: number): string {
  const r = Math.min(2, alto / 2);
  const y = BASE - alto;
  return `M${x},${BASE}V${y + r}Q${x},${y} ${x + r},${y}H${x + ANCHO_BARRA - r}Q${x + ANCHO_BARRA},${y} ${x + ANCHO_BARRA},${y + r}V${BASE}Z`;
}

export function resumenDelPeriodo(datos: VentasDia[]): string {
  const total = datos.reduce((suma, dia) => suma + numero(dia.ventas_brutas), 0);
  const dias = datos.length;
  if (total <= 0) return `No hubo ventas en los últimos ${dias} días.`;
  const mejor = datos.reduce((a, b) => (numero(b.ventas_brutas) > numero(a.ventas_brutas) ? b : a));
  return `Vendiste ${formatearMoneda(total)} en ${dias} días; el mejor día fue el ${formatearDiaMes(mejor.fecha)} con ${formatearMoneda(mejor.ventas_brutas)}.`;
}

interface Props {
  datos: VentasDia[];
  /** Versión pequeña para el panel: 64 px, sin ejes ni selector de tabla. */
  compacto?: boolean;
  className?: string;
}

export function BarrasPorDia({ datos, compacto = false, className }: Props) {
  const [vista, setVista] = useState<'grafico' | 'tabla'>('grafico');
  const id = useId();
  const n = datos.length;
  const maximo = maximoRedondeado(Math.max(0, ...datos.map((d) => numero(d.ventas_brutas))));
  const resumen = resumenDelPeriodo(datos);
  const ultimo = n - 1;
  const mostrarGrafico = compacto || vista === 'grafico';

  // Una etiqueta cada 7 días contando desde hoy; la última dice «Hoy».
  const etiquetas = datos
    .map((dia, indice) => ({ dia, indice }))
    .filter(({ indice }) => (ultimo - indice) % 7 === 0);

  const grafico = (
    <figure className="m-0">
      <figcaption id={`${id}-resumen`} className={cn('text-sm text-slate-600 dark:text-slate-300', compacto && 'sr-only')}>
        {resumen}
      </figcaption>
      <div className={cn('relative', !compacto && 'mt-3 pt-5')}>
        {!compacto && maximo > 0 && (
          <span className="absolute left-0 top-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400" aria-hidden="true">
            {formatearMoneda(maximo)}
          </span>
        )}
        <div className={compacto ? 'h-16' : 'h-40 md:h-56'}>
          <svg
            role="img"
            aria-labelledby={`${id}-resumen`}
            viewBox={`0 0 ${n * PASO} 120`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            {!compacto &&
              [1, 2, 3].map((k) => (
                <line
                  key={k}
                  x1={0}
                  x2={n * PASO}
                  y1={BASE - (ALTO * k) / 3}
                  y2={BASE - (ALTO * k) / 3}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
              ))}
            <g className="animate-crece" style={{ transformBox: 'view-box', transformOrigin: `0 ${BASE}px` }}>
              {datos.map((dia, indice) => {
                const valor = numero(dia.ventas_brutas);
                const alto = maximo > 0 ? Math.max((valor / maximo) * ALTO, valor > 0 ? 2 : 0) : 0;
                const x = indice * PASO + 1;
                const titulo = `${formatearDiaMes(dia.fecha)}: ${formatearMoneda(valor)} en ${pluralPedidos(dia.pedidos)}`;
                return (
                  <g key={dia.fecha}>
                    <title>{titulo}</title>
                    {alto > 0 && <path d={trazoBarra(x, alto)} className="fill-brand-600 dark:fill-brand-300" />}
                    {/* El día de hoy lleva un borde amarillo, no un relleno. */}
                    {indice === ultimo && alto > 0 && (
                      <rect
                        x={x}
                        y={BASE - alto}
                        width={ANCHO_BARRA}
                        height={alto}
                        fill="none"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        data-hoy="true"
                        className="stroke-amarillo"
                      />
                    )}
                    {/* Zona transparente: el título también sale al pasar sobre un día sin ventas. */}
                    <rect x={indice * PASO} y={0} width={PASO} height={120} fill="transparent" />
                  </g>
                );
              })}
            </g>
            <line x1={0} x2={n * PASO} y1={BASE} y2={BASE} strokeWidth={1} vectorEffect="non-scaling-stroke" className="stroke-slate-300 dark:stroke-slate-600" />
          </svg>
        </div>
        {!compacto && (
          <div className="relative mt-1 h-5 text-xs text-slate-500 dark:text-slate-400" aria-hidden="true">
            {etiquetas.map(({ dia, indice }) => (
              <span
                key={dia.fecha}
                className={cn(
                  'absolute whitespace-nowrap',
                  indice === ultimo ? 'right-0 font-bold text-slate-800 dark:text-slate-100' : '-translate-x-1/2',
                )}
                style={indice === ultimo ? undefined : { left: `${((indice + 0.5) / n) * 100}%` }}
              >
                {indice === ultimo ? 'Hoy' : formatearDiaMes(dia.fecha)}
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  );

  const tabla = (
    <div className="table-wrap max-h-80 overflow-y-auto" role="tabpanel" id={`${id}-tabla`} aria-labelledby={`${id}-tab-tabla`}>
      <table className="table">
        <caption className="sr-only">{resumen}</caption>
        <thead className="sticky top-0">
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col" className="text-right">Pedidos</th>
            <th scope="col" className="text-right">Ventas</th>
            <th scope="col" className="text-right">Ingreso neto</th>
          </tr>
        </thead>
        <tbody>
          {[...datos].reverse().map((dia) => (
            <tr key={dia.fecha}>
              <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium">{formatearDiaMes(dia.fecha)}</th>
              <td className="text-right tabular-nums">{dia.pedidos}</td>
              <td className="text-right tabular-nums">{formatearMoneda(dia.ventas_brutas)}</td>
              <td className="text-right tabular-nums">{formatearMoneda(dia.ingresos_netos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (compacto) return <div className={className}>{grafico}</div>;

  return (
    <div className={className}>
      <div className="mb-2 inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="tablist" aria-label="Forma de ver las ventas por día">
        {(['grafico', 'tabla'] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            role="tab"
            id={`${id}-tab-${opcion}`}
            aria-selected={vista === opcion}
            aria-controls={opcion === 'tabla' ? `${id}-tabla` : undefined}
            className={cn(
              'min-h-[36px] rounded-md px-3 text-sm font-semibold transition-colors',
              vista === opcion ? 'bg-brand-600 text-white dark:bg-brand-300 dark:text-slate-950' : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300',
            )}
            onClick={() => setVista(opcion)}
          >
            {opcion === 'grafico' ? 'Gráfico' : 'Tabla'}
          </button>
        ))}
      </div>
      {mostrarGrafico ? grafico : tabla}
    </div>
  );
}
