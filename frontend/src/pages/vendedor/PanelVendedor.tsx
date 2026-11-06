import { NumeroAnimado } from '../../components/ui/NumeroAnimado';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, BadgeCheck, Plus } from 'lucide-react';
import { listarPuestos, listarProductos } from '../../api/catalog';
import { listarPedidos } from '../../api/orders';
import { obtenerResumenIngresos, obtenerVentas, type VentasDia } from '../../api/payments';
import { miVerificacion } from '../../api/verification';
import { useSession } from '../../auth/SessionProvider';
import { Revela, lugar } from '../../components/Revela';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { EtiquetaEstado } from '../../components/ui/EtiquetaEstado';
import { CargandoBloque } from '../../components/ui/Estado';
import { formatearDiaMes, formatearFechaHora, formatearMoneda, numero, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { claves } from '../../lib/queryKeys';

/** Pesos en corto para la etiqueta de la barra: «$ 7 mil», «$ 1,2 M». */
function pesosCortos(valor: number): string {
  if (valor >= 1_000_000) return `$ ${(Math.round(valor / 100_000) / 10).toLocaleString('es-CO')} M`;
  if (valor >= 1_000) return `$ ${Math.round(valor / 1_000).toLocaleString('es-CO')} mil`;
  return formatearMoneda(valor);
}

/** Día de la semana corto («lun», «mar»…) de una fecha AAAA-MM-DD, sin depender de la zona horaria. */
function diaCorto(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  if (!anio || !mes || !dia) return fechaIso;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
}

/**
 * La semana en siete columnas: cada día con su nombre debajo y lo vendido encima de la barra.
 * Con uno o dos días de ventas se lee igual: los días sin ventas quedan como una raya en la base.
 */
function SemanaPorDia({ dias }: { dias: VentasDia[] }) {
  const maximo = Math.max(0, ...dias.map((d) => numero(d.ventas_brutas)));
  const ultimo = dias.length - 1;
  return (
    <ol className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
      {dias.map((dia, indice) => {
        const valor = numero(dia.ventas_brutas);
        const alto = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 6 : 0) : 0;
        const hoy = indice === ultimo;
        return (
          <li key={dia.fecha} className="flex min-w-0 flex-col items-center">
            <span className="sr-only">
              {hoy ? 'Hoy' : formatearDiaMes(dia.fecha)}: {valor > 0 ? `${formatearMoneda(valor)} en ${dia.pedidos} ${dia.pedidos === 1 ? 'pedido' : 'pedidos'}` : 'sin ventas'}
            </span>
            <div className="flex h-24 w-full flex-col justify-end" aria-hidden="true">
              {valor > 0 && (
                <span className="mb-1 truncate text-center text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {pesosCortos(valor)}
                </span>
              )}
              <div
                className={`animate-crece mx-auto w-full max-w-[2.5rem] origin-bottom rounded-t-[3px] ${
                  valor > 0 ? 'bg-brand-600 dark:bg-brand-300' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                style={{ height: valor > 0 ? `${alto * 0.62}%` : '2px', animationDelay: `${indice * 45}ms`, animationFillMode: 'backwards' }}
              />
            </div>
            <span
              className={`mt-1.5 text-xs capitalize ${hoy ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
              aria-hidden="true"
            >
              {hoy ? 'Hoy' : diaCorto(dia.fecha)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PanelVendedor() {
  const { usuario } = useSession();

  useEffect(() => {
    document.title = 'Panel de vendedor · RioMarket';
  }, []);

  const verificacion = useQuery({ queryKey: claves.miVerificacion, queryFn: miVerificacion });
  const puestos = useQuery({
    queryKey: claves.puestos.vendedor(usuario?.id),
    queryFn: () => listarPuestos({ vendedor: usuario!.id, page_size: 100 }),
    enabled: Boolean(usuario),
  });
  const productos = useQuery({
    queryKey: claves.productos.vendedorTotal,
    queryFn: () => listarProductos({ page_size: 1 }),
  });
  const pendientes = useQuery({
    queryKey: claves.pedidos.vendedorPendientes,
    queryFn: () => listarPedidos({ estado: 'pendiente', page_size: 5, ordering: '-fecha_creacion' }),
  });
  const ingresos = useQuery({
    queryKey: claves.pagos.resumenIngresos,
    queryFn: obtenerResumenIngresos,
  });

  const semana = useQuery({
    queryKey: claves.pagos.ventas(7, null),
    queryFn: () => obtenerVentas({ dias: 7 }),
  });

  const verificado = verificacion.data?.estado_verificacion === 'aprobado';
  const porAtender = pendientes.data?.count ?? 0;
  const puestoPrincipal = puestos.data?.results[0];

  // Las cifras de acompañamiento: texto en línea, sin cuadritos de icono.
  const franja = [
    { etiqueta: 'Puestos', valor: puestos.data?.count ?? 0, to: '/vendedor/puestos' },
    { etiqueta: 'Productos', valor: productos.data?.count ?? 0, to: '/vendedor/productos' },
    { etiqueta: 'Pagos aprobados', valor: ingresos.data?.pagos_aprobados ?? 0, to: '/vendedor/ventas' },
  ];

  return (
    <div>
      <EncabezadoPagina
        titulo={`Hola, ${usuario?.nombre.split(' ')[0] ?? 'vendedor'}`}
        descripcion="Este es el resumen de tu operación en RioMarket."
        acciones={
          verificado ? (
            <Link to="/vendedor/productos" className="btn-primary">
              <Plus className="h-4 w-4" /> Publicar producto
            </Link>
          ) : (
            <Link to="/vendedor/verificacion" className="btn-primary">
              <BadgeCheck className="h-4 w-4" /> Verificarme
            </Link>
          )
        }
      />

      {!verificacion.isLoading && !verificado && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {verificacion.data
                ? `Tu verificación está ${ETIQUETAS_VERIFICACION[verificacion.data.estado_verificacion]?.toLowerCase() ?? verificacion.data.estado_verificacion}.`
                : 'Aún no has enviado tu verificación.'}
            </p>
            <p className="mt-0.5">
              {verificacion.data?.estado_verificacion === 'rechazado' && verificacion.data.motivo_rechazo
                ? `Motivo: ${verificacion.data.motivo_rechazo}`
                : 'Necesitas la verificación aprobada para crear y administrar puestos y productos.'}
            </p>
          </div>
          <Link to="/vendedor/verificacion" className="btn-secondary shrink-0">Revisar verificación</Link>
        </div>
      )}

      {/* Una sola tarjeta: el dato que manda (lo que llevas ganado), la semana al lado y las demás cifras en una franja. */}
      <section className="card entra-lista overflow-hidden" aria-labelledby="panel-ingresos">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="p-5 sm:p-6">
            <h2 id="panel-ingresos" className="text-sm font-medium text-slate-500 dark:text-slate-400">Ingresos aprobados</h2>
            <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
              <NumeroAnimado texto={formatearMoneda(ingresos.data?.ingresos_aprobados)} />
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lo que ya es tuyo, después de la comisión.</p>

            {/* Lo que hay que atender: destaca solo si hay algo; si no, una línea tranquila. */}
            {pendientes.data &&
              (porAtender > 0 ? (
                <Link
                  to="/vendedor/pedidos"
                  className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3 text-brand-800 transition-colors hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-200 dark:hover:bg-brand-950"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-300" aria-hidden="true" />
                    <span className="text-sm">
                      <strong className="text-base font-extrabold tabular-nums"><NumeroAnimado texto={porAtender} /></strong>{' '}
                      {porAtender === 1 ? 'pedido espera tu respuesta' : 'pedidos esperan tu respuesta'}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                    Atender <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ) : (
                <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">No tienes pedidos por atender.</p>
              ))}
          </div>

          <div className="border-t border-slate-200 p-5 dark:border-slate-800 sm:p-6 lg:border-l lg:border-t-0" aria-labelledby="panel-semana" role="group">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="panel-semana" className="text-base font-bold">Últimos 7 días</h2>
              <Link to="/vendedor/ventas" className="link inline-flex items-center gap-1 text-sm">
                Ver ventas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {semana.isLoading && <div className="skeleton mt-4 h-28 w-full rounded-lg" />}
            {semana.data &&
              (semana.data.totales.pedidos_pagados === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Aún no cobras pedidos esta semana. Cuando lo hagas, verás aquí cuánto vendiste cada día.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-tinta tabular-nums dark:text-slate-100">{formatearMoneda(semana.data.totales.ventas_brutas)}</span>
                    {' '}en {semana.data.totales.pedidos_pagados} {semana.data.totales.pedidos_pagados === 1 ? 'pedido pagado' : 'pedidos pagados'}.
                  </p>
                  <SemanaPorDia dias={semana.data.por_dia} />
                </>
              ))}
          </div>
        </div>

        <ul className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {franja.map(({ etiqueta, valor, to }) => (
            <li key={etiqueta} className="min-w-0">
              <Link to={to} className="flex h-full flex-col px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:flex-row sm:items-baseline sm:gap-2 sm:px-6">
                <span className="text-lg font-bold tabular-nums"><NumeroAnimado texto={valor} /></span>
                <span className="text-xs leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">{etiqueta}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Revela as="div" className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card rv self-start p-5" style={lugar(0)} aria-labelledby="panel-pendientes">
          <div className="flex items-center justify-between gap-3">
            <h2 id="panel-pendientes" className="text-lg font-bold">Pedidos pendientes</h2>
            <Link to="/vendedor/pedidos" className="link inline-flex items-center gap-1 text-sm">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {pendientes.isLoading && <CargandoBloque mensaje="Buscando pedidos…" />}
          {pendientes.data?.results.length === 0 && (
            <div className="mt-3 text-sm">
              <p className="font-semibold">Todo al día.</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Cuando alguien te haga un pedido aparecerá aquí, y te avisaremos con una notificación.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                <Link to="/vendedor/productos" className="link">Revisar mis productos</Link>
                {puestoPrincipal && (
                  <Link to={`/puestos/${puestoPrincipal.id}`} className="link">Ver mi puesto como lo ven los clientes</Link>
                )}
              </div>
            </div>
          )}
          {Boolean(pendientes.data?.results.length) && (
            <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
              {pendientes.data?.results.map((pedido) => (
                <li key={pedido.id}>
                  <Link to={`/pedidos/${pedido.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-700 dark:hover:text-brand-300">
                    <div className="min-w-0">
                      <p className="font-semibold">Pedido #{pedido.id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatearFechaHora(pedido.fecha_creacion)} · {pedido.items.length} {pedido.items.length === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums">{formatearMoneda(pedido.total)}</span>
                      <EtiquetaEstado estado={pedido.estado} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="card rv self-start" style={lugar(1)} aria-label="Accesos rápidos">
          {puestoPrincipal && (
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tu puesto principal</h2>
              <p className="mt-1.5 font-semibold">{puestoPrincipal.nombre}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{puestoPrincipal.direccion}</p>
              <Link to={`/puestos/${puestoPrincipal.id}`} className="link mt-2 inline-flex items-center gap-1 text-sm">
                Ver en la tienda <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          <nav aria-label="Atajos del vendedor" className="p-2">
            {[
              { texto: 'Mis puestos', to: '/vendedor/puestos' },
              { texto: 'Cupones', to: '/vendedor/cupones' },
              { texto: 'Reseñas', to: '/vendedor/resenas' },
            ].map(({ texto, to }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-[44px] items-center justify-between rounded-lg px-3 text-sm transition-colors hover:bg-slate-50 hover:text-brand-700 dark:hover:bg-slate-800/60 dark:hover:text-brand-300 md:min-h-[40px]"
              >
                {texto} <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </aside>
      </Revela>
    </div>
  );
}
