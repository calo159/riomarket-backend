import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, CheckCircle2, CreditCard, Package, ShieldCheck, Truck } from 'lucide-react';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../api/notifications';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../components/ui/Estado';
import { Paginacion } from '../components/ui/Paginacion';
import { formatearFechaHora } from '../lib/format';
import { useToast } from '../components/ui/Toast';
import { mensajeDeError } from '../lib/errors';
import { cn } from '../lib/utils';

const TAMANO = 15;

export function Notificaciones() {
  const [pagina, setPagina] = useState(1);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    document.title = 'Notificaciones · RioMarket';
  }, []);

  const notificaciones = useQuery({
    queryKey: ['notificaciones', pagina, soloNoLeidas],
    queryFn: () => listarNotificaciones({ page: pagina, page_size: TAMANO, leida: soloNoLeidas ? false : undefined }),
    placeholderData: (anterior) => anterior,
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  const leer = useMutation({
    mutationFn: marcarLeida,
    onSuccess: invalidar,
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const leerTodas = useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: (cantidad) => {
      invalidar();
      toast.exito(cantidad ? `${cantidad} notificaciones marcadas como leídas.` : 'No había notificaciones sin leer.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const icono = (tipo: string) => {
    if (tipo === 'pago_aprobado' || tipo === 'pago_rechazado') return <CreditCard className="h-5 w-5" />;
    if (tipo === 'verificacion') return <ShieldCheck className="h-5 w-5" />;
    if (tipo === 'pedido_en_camino') return <Truck className="h-5 w-5" />;
    if (tipo === 'pedido_entregado') return <CheckCircle2 className="h-5 w-5" />;
    return <Package className="h-5 w-5" />;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <EncabezadoPagina
        titulo="Notificaciones"
        descripcion="Novedades sobre tus pedidos, pagos y verificaciones."
        acciones={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => leerTodas.mutate()}
            disabled={leerTodas.isPending}
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas como leídas
          </button>
        }
      />

      <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded text-brand-600"
          checked={soloNoLeidas}
          onChange={(evento) => {
            setSoloNoLeidas(evento.target.checked);
            setPagina(1);
          }}
        />
        Ver solo las no leídas
      </label>

      {notificaciones.isLoading && <CargandoBloque mensaje="Cargando notificaciones…" />}
      {notificaciones.isError && <EstadoError mensaje="No pudimos cargar tus notificaciones." onReintentar={() => void notificaciones.refetch()} />}
      {notificaciones.data && notificaciones.data.results.length === 0 && (
        <EstadoVacio
          titulo="No hay notificaciones"
          descripcion={soloNoLeidas ? 'Estás al día: no tienes notificaciones sin leer.' : 'Aquí verás las novedades de tus pedidos y pagos.'}
          icono={<Bell className="h-9 w-9" />}
        />
      )}
      {notificaciones.data && notificaciones.data.results.length > 0 && (
        <>
          <div className="space-y-2">
            {notificaciones.data.results.map((notificacion) => {
              const contenido = (
                <>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      notificacion.leida
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
                    )}
                  >
                    {icono(notificacion.tipo)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm', notificacion.leida ? 'font-medium' : 'font-bold')}>{notificacion.titulo}</p>
                      {!notificacion.leida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Sin leer" />}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{notificacion.mensaje}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatearFechaHora(notificacion.fecha_creacion)}</p>
                  </div>
                </>
              );

              const clase = cn(
                'flex items-start gap-3 rounded-xl border p-4 transition',
                notificacion.leida ? 'bg-white dark:bg-slate-900' : 'border-brand-200 bg-brand-50/60 dark:border-brand-900 dark:bg-brand-950/30',
              );

              return notificacion.id_pedido ? (
                <Link
                  key={notificacion.id}
                  to={`/pedidos/${notificacion.id_pedido}`}
                  className={cn(clase, 'hover:border-brand-300')}
                  onClick={() => {
                    if (!notificacion.leida) leer.mutate(notificacion.id);
                  }}
                >
                  {contenido}
                </Link>
              ) : (
                <button
                  key={notificacion.id}
                  type="button"
                  className={cn(clase, 'w-full text-left hover:border-brand-300')}
                  onClick={() => {
                    if (!notificacion.leida) leer.mutate(notificacion.id);
                  }}
                >
                  {contenido}
                </button>
              );
            })}
          </div>
          <Paginacion pagina={pagina} total={notificaciones.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={notificaciones.isFetching} />
        </>
      )}
    </div>
  );
}
