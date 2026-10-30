import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CreditCard,
  PackageX,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { obtenerResumenAdmin } from '../../api/admin';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { CargandoBloque, EstadoError } from '../../components/ui/Estado';
import { formatearMoneda } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { claves } from '../../lib/queryKeys';

export function PanelAdmin() {
  useEffect(() => {
    document.title = 'Administración · RioMarket';
  }, []);

  const resumen = useQuery({ queryKey: claves.adminResumen, queryFn: obtenerResumenAdmin });

  if (resumen.isLoading) return <CargandoBloque mensaje="Cargando el resumen…" />;
  if (resumen.isError || !resumen.data) {
    return <EstadoError mensaje={mensajeDeError(resumen.error, 'No pudimos cargar el resumen.')} onReintentar={() => void resumen.refetch()} />;
  }

  const datos = resumen.data;
  const atencion = [
    {
      etiqueta: 'Verificaciones pendientes',
      valor: datos.verificaciones_pendientes,
      icono: ShieldCheck,
      to: '/admin/verificaciones',
    },
    {
      etiqueta: 'Pedidos con "no me llegó"',
      valor: datos.pedidos.con_no_recibido,
      icono: PackageX,
      to: '/admin/pedidos?con_no_recibido=true',
    },
    {
      etiqueta: 'Pagos por confirmar',
      valor: datos.pagos.por_confirmar,
      icono: CreditCard,
      to: '/admin/pagos?por_confirmar=true',
    },
    {
      etiqueta: 'Puestos suspendidos',
      valor: datos.puestos.por_estado.suspendido ?? 0,
      icono: Store,
      to: '/admin/puestos?estado=suspendido',
    },
  ];

  const metricas = [
    { etiqueta: 'Usuarios activos', valor: datos.usuarios.activos },
    { etiqueta: 'Vendedores', valor: datos.usuarios.por_rol.vendedor ?? 0 },
    { etiqueta: 'Pedidos activos', valor: datos.pedidos.activos },
    { etiqueta: 'Entregados', valor: datos.pedidos.por_estado.entregado ?? 0 },
    { etiqueta: 'Productos bloqueados', valor: datos.productos.bloqueados },
    { etiqueta: 'Total vendido', valor: formatearMoneda(datos.pagos.total_vendido) },
  ];

  return (
    <div>
      <EncabezadoPagina titulo="Panel de administración" descripcion="Supervisión y moderación del marketplace." />

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Requiere atención
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {atencion.map(({ etiqueta, valor, icono: Icono, to }) => (
            <Link key={etiqueta} to={to} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{etiqueta}</p>
                  <p className={`mt-1 text-2xl font-extrabold ${valor > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>{valor}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <Icono className="h-5 w-5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5" /> Resumen general
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricas.map(({ etiqueta, valor }) => (
            <div key={etiqueta} className="card p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">{etiqueta}</p>
              <p className="mt-1 text-2xl font-extrabold">{valor}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-slate-400">
        Actualizado {new Date(datos.generado_en).toLocaleString('es-CO')}. Usuarios suspendidos: {datos.usuarios.suspendidos}. Reseñas ocultas: {datos.resenas.ocultas}.
      </p>
    </div>
  );
}
