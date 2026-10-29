import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, ClipboardList, Package, Truck, XCircle } from 'lucide-react';
import { ejecutarAccionPedido, listarPedidos, type AccionPedido } from '../../api/orders';
import { useSession } from '../../auth/SessionProvider';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { EtiquetaEstado } from '../../components/ui/EtiquetaEstado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { ConfirmarModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora, formatearMoneda } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';

const TAMANO = 12;

const SIGUIENTE: Record<string, { accion: AccionPedido; etiqueta: string; icono: typeof CheckCircle2 } | null> = {
  pendiente: { accion: 'confirmar', etiqueta: 'Confirmar pedido', icono: CheckCircle2 },
  confirmado: { accion: 'en-preparacion', etiqueta: 'Pasar a preparación', icono: Package },
  en_preparacion: { accion: 'enviar', etiqueta: 'Entregado al domiciliario / listo', icono: Truck },
  // En camino: ya no hay acción del vendedor; solo el comprador confirma la recepción.
  en_camino: null,
  entregado: null,
  cancelado: null,
};

export function PedidosVendedor() {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [cancelar, setCancelar] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Pedidos del puesto · RioMarket';
  }, []);

  const pedidos = useQuery({
    queryKey: ['pedidos', 'vendedor', usuario?.id, pagina, estado],
    queryFn: () => listarPedidos({ page: pagina, page_size: TAMANO, estado: estado || undefined }),
    placeholderData: (anterior) => anterior,
  });

  const accion = useMutation({
    mutationFn: ({ id, tipo }: { id: number; tipo: AccionPedido }) => ejecutarAccionPedido(id, tipo),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      void queryClient.invalidateQueries({ queryKey: ['pagos'] });
      void queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      setCancelar(null);
      toast.exito(variables.tipo === 'cancelar' ? 'Pedido cancelado.' : 'Pedido actualizado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion="Confirma, avanza y gestiona los pedidos de tus puestos."
        acciones={
          <select
            className="input w-auto"
            value={estado}
            onChange={(evento) => {
              setEstado(evento.target.value);
              setPagina(1);
            }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmado">Confirmados</option>
            <option value="en_preparacion">En preparación</option>
            <option value="en_camino">En camino</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        }
      />

      {pedidos.isLoading && <CargandoBloque mensaje="Cargando pedidos…" />}
      {pedidos.isError && <EstadoError mensaje="No pudimos cargar los pedidos." onReintentar={() => void pedidos.refetch()} />}
      {pedidos.data && pedidos.data.results.length === 0 && (
        <EstadoVacio
          titulo="Sin pedidos"
          descripcion="Cuando un comprador realice un pedido en tu puesto, aparecerá aquí."
          icono={<ClipboardList className="h-9 w-9" />}
        />
      )}
      {pedidos.data && pedidos.data.results.length > 0 && (
        <>
          <div className="space-y-3">
            {pedidos.data.results.map((pedido) => {
              const permitidas = pedido.acciones_permitidas ?? [];
              const candidata = SIGUIENTE[pedido.estado];
              const siguiente = candidata && permitidas.includes(candidata.accion) ? candidata : null;
              const puedeCancelar = permitidas.includes('cancelar');
              const Icono = siguiente?.icono;
              return (
                <article key={pedido.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/pedidos/${pedido.id}`} className="font-semibold hover:text-brand-700 dark:hover:text-brand-300">
                        Pedido #{pedido.id}
                      </Link>
                      <EtiquetaEstado estado={pedido.estado} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{pedido.tipo_entrega === 'domicilio' ? 'Domicilio' : 'Retiro'}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {formatearFechaHora(pedido.fecha_creacion)} · {pedido.items.length} {pedido.items.length === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{formatearMoneda(pedido.total)}</p>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link to={`/pedidos/${pedido.id}`} className="btn-secondary py-1.5 text-xs">
                      Ver detalle <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {pedido.estado === 'en_camino' && (
                      <p
                        className={
                          pedido.no_recibido_en
                            ? 'self-center rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                            : 'self-center text-xs text-slate-500 dark:text-slate-400'
                        }
                      >
                        {pedido.no_recibido_en
                          ? 'El comprador reporta que no le ha llegado'
                          : 'Esperando que el comprador confirme'}
                      </p>
                    )}
                    {siguiente && Icono && (
                      <button
                        type="button"
                        className="btn-primary py-1.5 text-xs"
                        onClick={() => accion.mutate({ id: pedido.id, tipo: siguiente.accion })}
                        disabled={accion.isPending}
                      >
                        <Icono className="h-3.5 w-3.5" /> {siguiente.etiqueta}
                      </button>
                    )}
                    {puedeCancelar && (
                      <button
                        type="button"
                        className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400"
                        onClick={() => setCancelar(pedido.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancelar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <Paginacion pagina={pagina} total={pedidos.data.count} tamano={TAMANO} onCambiar={setPagina} cargando={pedidos.isFetching} />
        </>
      )}

      <ConfirmarModal
        abierto={Boolean(cancelar)}
        titulo="¿Cancelar este pedido?"
        descripcion="Se repondrá el stock. Si hay un pago aprobado, quedará pendiente de reembolso."
        textoConfirmar="Cancelar pedido"
        cargando={accion.isPending}
        onConfirmar={() => cancelar && accion.mutate({ id: cancelar, tipo: 'cancelar' })}
        onCerrar={() => setCancelar(null)}
      />
    </div>
  );
}
