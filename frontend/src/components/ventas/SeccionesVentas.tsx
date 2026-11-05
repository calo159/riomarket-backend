import { NumeroAnimado } from '../ui/NumeroAnimado';
import type { ReactNode } from 'react';
import type { VentasPanel } from '../../api/payments';
import { formatearMoneda } from '../../lib/format';
import { BarrasHorizontales } from '../graficos/BarrasHorizontales';
import { BarrasPorDia } from '../graficos/BarrasPorDia';

function Cifra({ etiqueta, valor, ayuda }: { etiqueta: string; valor: ReactNode; ayuda?: string }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-xs leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">{etiqueta}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums sm:text-xl">
        {typeof valor === 'string' || typeof valor === 'number' ? <NumeroAnimado texto={valor} /> : valor}
      </p>
      {ayuda && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{ayuda}</p>}
    </div>
  );
}

/**
 * Las cifras del periodo en una sola tarjeta: el ingreso neto manda (grande, en turquesa) y las otras tres lo
 * acompañan separadas por líneas finas. En celular, el ingreso arriba y las tres debajo.
 */
export function TarjetasVentas({ datos }: { datos: VentasPanel }) {
  const { totales } = datos;
  return (
    <div className="card grid overflow-hidden md:grid-cols-[minmax(0,1.5fr)_minmax(0,3fr)]">
      <div className="px-5 py-5 sm:px-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Ingreso neto</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-brand-600 dark:text-brand-300 sm:text-4xl">
          <NumeroAnimado texto={formatearMoneda(totales.ingresos_netos)} />
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {Number(totales.envios_incluidos) > 0
            ? `Después de la comisión y los cupones. Incluye ${formatearMoneda(totales.envios_incluidos)} de envíos`
            : 'Después de la comisión y los cupones'}
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800 md:border-l md:border-t-0">
        <Cifra etiqueta="Ventas" valor={formatearMoneda(totales.ventas_brutas)} ayuda="Sin domicilio" />
        <Cifra etiqueta="Pedidos pagados" valor={totales.pedidos_pagados} />
        <Cifra etiqueta="Ticket promedio" valor={formatearMoneda(totales.ticket_promedio)} />
      </div>
    </div>
  );
}

export function SeccionVentasPorDia({ datos }: { datos: VentasPanel }) {
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="ventas-por-dia">
      <h2 id="ventas-por-dia" className="mb-3 text-lg font-bold">Ventas por día</h2>
      <BarrasPorDia datos={datos.por_dia} />
    </section>
  );
}

export function SeccionTopProductos({ datos, conPuesto = false }: { datos: VentasPanel; conPuesto?: boolean }) {
  return (
    <section className="card self-start p-4 sm:p-5" aria-labelledby="ventas-top">
      <h2 id="ventas-top" className="mb-3 text-lg font-bold">Lo que más vendes</h2>
      {datos.top_productos.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay productos vendidos en este periodo.</p>
      ) : (
        <BarrasHorizontales
          filas={datos.top_productos.map((producto) => ({
            id: producto.id_producto,
            nombre: producto.nombre,
            unidades: producto.unidades,
            ventas: producto.ventas_brutas,
            detalle: conPuesto ? producto.puesto_nombre : null,
          }))}
        />
      )}
    </section>
  );
}
