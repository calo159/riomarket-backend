import type { ReactNode } from 'react';
import type { VentasPanel } from '../../api/payments';
import { formatearMoneda } from '../../lib/format';
import { BarrasHorizontales } from '../graficos/BarrasHorizontales';
import { BarrasPorDia } from '../graficos/BarrasPorDia';

function Cifra({ etiqueta, valor, ayuda, destacada }: { etiqueta: string; valor: ReactNode; ayuda?: string; destacada?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{etiqueta}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums sm:text-2xl ${destacada ? 'text-brand-600 dark:text-brand-300' : ''}`}>{valor}</p>
      {ayuda && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ayuda}</p>}
    </div>
  );
}

/** Las cuatro cifras del periodo: 2 columnas en móvil, 4 en escritorio. */
export function TarjetasVentas({ datos }: { datos: VentasPanel }) {
  const { totales } = datos;
  return (
    <div className="entra-lista grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <Cifra etiqueta="Ingreso neto" valor={formatearMoneda(totales.ingresos_netos)} ayuda="Después de la comisión y los cupones" destacada />
      <Cifra etiqueta="Ventas" valor={formatearMoneda(totales.ventas_brutas)} ayuda="Sin domicilio" />
      <Cifra etiqueta="Pedidos pagados" valor={totales.pedidos_pagados} />
      <Cifra etiqueta="Ticket promedio" valor={formatearMoneda(totales.ticket_promedio)} />
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
    <section className="card p-4 sm:p-5" aria-labelledby="ventas-top">
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
