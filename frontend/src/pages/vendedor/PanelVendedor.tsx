import { NumeroAnimado } from '../../components/ui/NumeroAnimado';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  Package,
  Plus,
  Star,
  Store,
  Ticket,
} from 'lucide-react';
import { listarPuestos, listarProductos } from '../../api/catalog';
import { listarPedidos } from '../../api/orders';
import { obtenerResumenIngresos, obtenerVentas } from '../../api/payments';
import { miVerificacion } from '../../api/verification';
import { useSession } from '../../auth/SessionProvider';
import { BarrasPorDia } from '../../components/graficos/BarrasPorDia';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { EtiquetaEstado } from '../../components/ui/EtiquetaEstado';
import { CargandoBloque } from '../../components/ui/Estado';
import { formatearFechaHora, formatearMoneda, ETIQUETAS_VERIFICACION } from '../../lib/format';
import { claves } from '../../lib/queryKeys';

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

  const tarjetas = [
    { etiqueta: 'Puestos', valor: puestos.data?.count ?? 0, icono: Store, to: '/vendedor/puestos', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
    { etiqueta: 'Productos', valor: productos.data?.count ?? 0, icono: Package, to: '/vendedor/productos', color: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' },
    { etiqueta: 'Pedidos pendientes', valor: pendientes.data?.count ?? 0, icono: ClipboardList, to: '/vendedor/pedidos', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    { etiqueta: 'Ingresos aprobados', valor: formatearMoneda(ingresos.data?.ingresos_aprobados), icono: CreditCard, to: '/vendedor/ventas', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
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

      <div className="entra-lista grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ etiqueta, valor, icono: Icono, to, color }) => (
          <Link key={etiqueta} to={to} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{etiqueta}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums"><NumeroAnimado texto={valor} /></p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icono className="h-5 w-5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {semana.data && (
        <section className="card mt-5 p-4 sm:p-5" aria-labelledby="panel-semana">
          <div className="flex items-center justify-between gap-3">
            <h2 id="panel-semana" className="text-base font-bold">Últimos 7 días</h2>
            <Link to="/vendedor/ventas" className="link inline-flex items-center gap-1 text-sm">
              Ver ventas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {semana.data.totales.pedidos_pagados === 0 ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Aún no cobras pedidos esta semana. Cuando lo hagas, verás aquí cuánto vendiste cada día.
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-bold text-tinta tabular-nums dark:text-slate-100">{formatearMoneda(semana.data.totales.ventas_brutas)}</span>
                {' '}en {semana.data.totales.pedidos_pagados} {semana.data.totales.pedidos_pagados === 1 ? 'pedido pagado' : 'pedidos pagados'}.
              </p>
              <BarrasPorDia datos={semana.data.por_dia} compacto className="mt-2" />
            </div>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pedidos pendientes</h2>
            <Link to="/vendedor/pedidos" className="link inline-flex items-center gap-1 text-sm">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {pendientes.isLoading && <CargandoBloque mensaje="Buscando pedidos…" />}
          {pendientes.data?.results.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-slate-500 dark:text-slate-400">
              No tienes pedidos pendientes. Los nuevos pedidos aparecerán aquí.
            </p>
          )}
          <div className="mt-3 divide-y">
            {pendientes.data?.results.map((pedido) => (
              <Link key={pedido.id} to={`/pedidos/${pedido.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-700 dark:hover:text-brand-300">
                <div className="min-w-0">
                  <p className="font-semibold">Pedido #{pedido.id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatearFechaHora(pedido.fecha_creacion)} · {pedido.items.length} {pedido.items.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{formatearMoneda(pedido.total)}</span>
                  <EtiquetaEstado estado={pedido.estado} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-base font-bold">Accesos rápidos</h2>
            <div className="mt-3 space-y-2">
              <Link to="/vendedor/puestos" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <Store className="h-4 w-4 text-brand-600" /> Mis puestos
              </Link>
              <Link to="/vendedor/cupones" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <Ticket className="h-4 w-4 text-brand-600" /> Cupones
              </Link>
              <Link to="/vendedor/resenas" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <Star className="h-4 w-4 text-brand-600" /> Reseñas
              </Link>
            </div>
          </section>
          {puestos.data?.results[0] && (
            <section className="card p-5">
              <h2 className="text-base font-bold">Tu puesto principal</h2>
              <p className="mt-1 font-medium">{puestos.data.results[0].nombre}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{puestos.data.results[0].direccion}</p>
              <Link to={`/puestos/${puestos.data.results[0].id}`} className="btn-secondary mt-3 w-full">Ver en la tienda</Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
