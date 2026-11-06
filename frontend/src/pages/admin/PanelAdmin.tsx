import { NumeroAnimado } from '../../components/ui/NumeroAnimado';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { obtenerResumenAdmin } from '../../api/admin';
import { listarPuestos } from '../../api/catalog';
import { obtenerVentas } from '../../api/payments';
import { Revela, lugar } from '../../components/Revela';
import { SeccionTopProductos, SeccionVentasPorDia, TarjetasVentas } from '../../components/ventas/SeccionesVentas';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { formatearMoneda } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { claves } from '../../lib/queryKeys';
import { nombreMarca } from '../../lib/sitio';

export function PanelAdmin() {
  useEffect(() => {
    document.title = `Administración · ${nombreMarca()}`;
  }, []);

  const resumen = useQuery({ queryKey: claves.adminResumen, queryFn: obtenerResumenAdmin });
  const [puesto, setPuesto] = useState<number | null>(null);
  const puestos = useQuery({
    queryKey: claves.puestos.todosParaSeleccion,
    queryFn: () => listarPuestos({ page_size: 200 }),
  });
  const ventas = useQuery({
    queryKey: claves.pagos.ventas(30, puesto),
    queryFn: () => obtenerVentas({ dias: 30, puesto }),
    placeholderData: keepPreviousData,
  });

  if (resumen.isLoading) return <CargandoBloque mensaje="Cargando el resumen…" />;
  if (resumen.isError || !resumen.data) {
    return <EstadoError mensaje={mensajeDeError(resumen.error, 'No pudimos cargar el resumen.')} onReintentar={() => void resumen.refetch()} />;
  }

  const datos = resumen.data;
  const atencion = [
    { etiqueta: 'Verificaciones pendientes', valor: datos.verificaciones_pendientes, to: '/admin/verificaciones' },
    { etiqueta: 'Pedidos con "no me llegó"', valor: datos.pedidos.con_no_recibido, to: '/admin/pedidos?con_no_recibido=true' },
    { etiqueta: 'Pagos por confirmar', valor: datos.pagos.por_confirmar, to: '/admin/pagos?por_confirmar=true' },
    { etiqueta: 'Vendedores en pausa por comisión', valor: datos.comisiones.bloqueado, to: '/admin/pagos' },
    { etiqueta: 'Puestos suspendidos', valor: datos.puestos.por_estado.suspendido ?? 0, to: '/admin/puestos?estado=suspendido' },
  ];
  const pendientes = atencion.reduce((suma, { valor }) => suma + valor, 0);
  // Lo que tiene algo va primero; los ceros quedan debajo, en gris.
  const ordenada = [...atencion].sort((a, b) => Number(b.valor > 0) - Number(a.valor > 0));

  const metricas = [
    { etiqueta: 'Usuarios activos', valor: datos.usuarios.activos },
    { etiqueta: 'Vendedores', valor: datos.usuarios.por_rol.vendedor ?? 0 },
    { etiqueta: 'Pedidos activos', valor: datos.pedidos.activos },
    { etiqueta: 'Entregados', valor: datos.pedidos.por_estado.entregado ?? 0 },
    { etiqueta: 'Productos bloqueados', valor: datos.productos.bloqueados },
  ];

  return (
    <div>
      <EncabezadoPagina titulo="Panel de administración" descripcion="Supervisión y moderación del marketplace." />

      <div className="entra-lista grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* El dato que manda: cuántos asuntos esperan a alguien. Con cero, se ve tranquilo. */}
        <section className="card flex flex-col overflow-hidden" aria-labelledby="admin-atencion">
          <div className="grid flex-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="p-5 sm:p-6">
              <h2 id="admin-atencion" className="text-sm font-medium text-slate-500 dark:text-slate-400">Requiere atención</h2>
              {pendientes > 0 ? (
                <>
                  <p className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums text-amber-700 dark:text-amber-300">
                    <NumeroAnimado texto={pendientes} />
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {pendientes === 1 ? 'asunto espera una revisión' : 'asuntos esperan una revisión'}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 flex items-center gap-2 text-xl font-bold text-exito dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 animate-pop" aria-hidden="true" /> Todo al día
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nada espera una revisión ahora mismo.</p>
                </>
              )}
            </div>
            <ul className="flex flex-col divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800 sm:border-l sm:border-t-0">
              {ordenada.map(({ etiqueta, valor, to }) => (
                <li key={etiqueta} className="flex flex-1 flex-col">
                  <Link
                    to={to}
                    className={`group flex min-h-[44px] flex-1 items-center justify-between gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 md:min-h-[40px] ${
                      valor > 0 ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${valor > 0 ? 'bg-amber-600 dark:bg-amber-300' : 'bg-slate-300 dark:bg-slate-600'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{etiqueta}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`tabular-nums ${valor > 0 ? 'text-base font-extrabold text-amber-700 dark:text-amber-300' : ''}`}>
                        <NumeroAnimado texto={valor} />
                      </span>
                      {valor > 0 && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* El acompañamiento: lo vendido como cifra de cabecera y el resto en una lista de líneas finas. */}
        <section className="card p-5 sm:p-6" aria-labelledby="admin-resumen">
          <h2 id="admin-resumen" className="text-sm font-medium text-slate-500 dark:text-slate-400">Resumen general</h2>
          <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
            <NumeroAnimado texto={formatearMoneda(datos.pagos.total_vendido)} />
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total vendido</p>
          <dl className="mt-4 grid gap-x-6 sm:grid-cols-2 border-t border-slate-200 text-sm dark:border-slate-800">
            {metricas.map(({ etiqueta, valor }) => (
              <div key={etiqueta} className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
                <dd className="font-bold tabular-nums"><NumeroAnimado texto={valor} /></dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <Revela className="mt-8" aria-labelledby="admin-ventas">
        <div className="rv mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={lugar(0)}>
          <h2 id="admin-ventas" className="text-lg font-bold">Ventas del mercado · últimos 30 días</h2>
          <select
            className="input w-auto"
            aria-label="Puesto"
            value={puesto ?? ''}
            onChange={(evento) => setPuesto(evento.target.value ? Number(evento.target.value) : null)}
          >
            <option value="">Todos los puestos</option>
            {puestos.data?.results.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
        </div>
        {ventas.isError && !ventas.data && (
          <EstadoError mensaje="No pudimos cargar las ventas del mercado." onReintentar={() => void ventas.refetch()} />
        )}
        {ventas.data && (
          <div className={`space-y-4 transition-opacity ${ventas.isPlaceholderData ? 'opacity-60' : ''}`}>
            <div className="rv" style={lugar(1)}>
              <TarjetasVentas datos={ventas.data} />
            </div>
            {ventas.data.totales.pedidos_pagados === 0 ? (
              <p className="card rv p-5 text-sm text-slate-600 dark:text-slate-300" style={lugar(2)}>
                No hay pagos aprobados en este periodo{puesto ? ' para ese puesto' : ''}.
              </p>
            ) : (
              <div className="rv grid items-start gap-5 lg:grid-cols-[3fr_2fr]" style={lugar(2)}>
                <SeccionVentasPorDia datos={ventas.data} />
                <SeccionTopProductos datos={ventas.data} conPuesto />
              </div>
            )}
          </div>
        )}
      </Revela>

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Actualizado {new Date(datos.generado_en).toLocaleString('es-CO')}. Usuarios suspendidos: {datos.usuarios.suspendidos}. Reseñas ocultas: {datos.resenas.ocultas}.
      </p>
    </div>
  );
}
