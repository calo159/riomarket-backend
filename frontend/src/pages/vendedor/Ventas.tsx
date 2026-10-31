import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listarPuestos } from '../../api/catalog';
import { obtenerVentas, type DiasVentas } from '../../api/payments';
import { useSession } from '../../auth/SessionProvider';
import { ConteoEstados } from '../../components/graficos/ConteoEstados';
import { SeccionTopProductos, SeccionVentasPorDia, TarjetasVentas } from '../../components/ventas/SeccionesVentas';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { formatearDiaMes } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { claves } from '../../lib/queryKeys';
import { cn } from '../../lib/utils';

const PERIODOS: { dias: DiasVentas; etiqueta: string }[] = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
];

function EsqueletoVentas() {
  return (
    <div role="status" aria-label="Cargando tus ventas" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-2 p-4">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-7 w-1/2" />
          </div>
        ))}
      </div>
      <div className="card p-5" aria-hidden="true">
        <div className="skeleton mb-4 h-6 w-1/3" />
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}

export function Ventas() {
  const { usuario } = useSession();
  const [dias, setDias] = useState<DiasVentas>(30);
  const [puesto, setPuesto] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Ventas · RioMarket';
  }, []);

  const puestos = useQuery({
    queryKey: claves.puestos.vendedor(usuario?.id),
    queryFn: () => listarPuestos({ vendedor: usuario!.id, page_size: 100 }),
    enabled: Boolean(usuario),
  });
  const sinPuestos = puestos.data?.count === 0;

  const ventas = useQuery({
    queryKey: claves.pagos.ventas(dias, puesto),
    queryFn: () => obtenerVentas({ dias, puesto }),
    placeholderData: keepPreviousData,
    enabled: puestos.isSuccess && !sinPuestos,
  });

  const datos = ventas.data;
  const lista = puestos.data?.results ?? [];

  const controles = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Periodo">
        {PERIODOS.map((periodo) => (
          <button
            key={periodo.dias}
            type="button"
            aria-pressed={dias === periodo.dias}
            className={cn(
              'min-h-[40px] rounded-md px-3 text-sm font-semibold transition-colors',
              dias === periodo.dias
                ? 'bg-brand-600 text-white dark:bg-brand-300 dark:text-slate-950'
                : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300',
            )}
            onClick={() => setDias(periodo.dias)}
          >
            {periodo.etiqueta}
          </button>
        ))}
      </div>
      {lista.length > 1 && (
        <select
          className="input w-auto"
          aria-label="Puesto"
          value={puesto ?? ''}
          onChange={(evento) => setPuesto(evento.target.value ? Number(evento.target.value) : null)}
        >
          <option value="">Todos mis puestos</option>
          {lista.map((item) => (
            <option key={item.id} value={item.id}>{item.nombre}</option>
          ))}
        </select>
      )}
    </div>
  );

  return (
    <div>
      <EncabezadoPagina titulo="Ventas" descripcion="Lo que cobraste en tus puestos. Cuenta solo pagos aprobados." />

      {sinPuestos ? (
        <EstadoVacio
          titulo="Primero crea tu puesto para empezar a vender."
          descripcion="Cuando tengas un puesto y cobres tu primer pedido, aquí verás tus ventas."
          accion={<Link to="/vendedor/puestos" className="btn-primary">Crear puesto</Link>}
        />
      ) : (
        <div className="space-y-5">
          {controles}

          {ventas.isLoading && <EsqueletoVentas />}
          {ventas.isError && !datos && (
            <EstadoError mensaje="No pudimos cargar tus ventas." onReintentar={() => void ventas.refetch()} />
          )}

          {datos && (
            <div className={cn('space-y-5', ventas.isPlaceholderData && 'opacity-60')} aria-busy={ventas.isPlaceholderData}>
              <TarjetasVentas datos={datos} />

              {datos.totales.pedidos_pagados === 0 ? (
                <EstadoVacio
                  titulo="Todavía no tienes ventas en este periodo"
                  descripcion="Cuando cobres un pedido, aquí verás cuánto vendiste cada día y qué productos se venden más."
                  accion={<Link to="/vendedor/pedidos" className="btn-primary">Ver mis pedidos</Link>}
                />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
                  <SeccionVentasPorDia datos={datos} />
                  <SeccionTopProductos datos={datos} />
                </div>
              )}

              <section className="card p-4 sm:p-5" aria-labelledby="ventas-estados">
                <h2 id="ventas-estados" className="mb-3 text-lg font-bold">Pedidos del periodo</h2>
                <ConteoEstados conteo={datos.pedidos_por_estado} base="/vendedor/pedidos" />
                {datos.cancelados_por_plazo > 0 && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {datos.cancelados_por_plazo === 1
                      ? '1 pedido se canceló solo por plazo.'
                      : `${datos.cancelados_por_plazo} pedidos se cancelaron solos por plazo.`}
                  </p>
                )}
              </section>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Últimos {datos.dias} días: del {formatearDiaMes(datos.desde)} al {formatearDiaMes(datos.hasta)}, en hora de Colombia.
              </p>
            </div>
          )}
          {ventas.isError && datos && <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-400">{mensajeDeError(ventas.error, 'No pudimos actualizar tus ventas.')}</p>}
        </div>
      )}
    </div>
  );
}
