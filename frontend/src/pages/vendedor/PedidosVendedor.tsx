import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, ClipboardList, XCircle } from 'lucide-react';
import { ejecutarAccionPedido, listarPedidos, type AccionPedido } from '../../api/orders';
import { useSession } from '../../auth/SessionProvider';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { EtiquetaEstado } from '../../components/ui/EtiquetaEstado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { ConfirmarModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora, formatearMoneda, OPCIONES_FILTRO_PEDIDO } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';
import { claves } from '../../lib/queryKeys';
import { estaPorVencer, textoCuentaRegresiva, useAhora } from '../../lib/plazo';
import { BotonDarMasTiempo } from '../pedido/BotonDarMasTiempo';
import { ICONOS_SIGUIENTE, siguienteAccion } from '../pedido/siguienteAccion';

const TAMANO = 12;

export function PedidosVendedor() {
  const { usuario } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [params] = useSearchParams();
  // Los enlaces del panel de ventas llegan con ?estado=: se usa solo si es un estado conocido.
  const estadoInicial = params.get('estado') ?? '';
  const [estado, setEstado] = useState(
    OPCIONES_FILTRO_PEDIDO.some((opcion) => opcion.valor === estadoInicial) ? estadoInicial : '',
  );
  const [cancelar, setCancelar] = useState<number | null>(null);
  const [cancelaEncargo, setCancelaEncargo] = useState(false);
  const ahora = useAhora();

  useEffect(() => {
    document.title = 'Pedidos del puesto · RioMarket';
  }, []);

  const pedidos = useQuery({
    queryKey: claves.pedidos.vendedor(usuario?.id, pagina, estado),
    queryFn: () => listarPedidos({ page: pagina, page_size: TAMANO, estado: estado || undefined }),
    placeholderData: (anterior) => anterior,
  });

  const accion = useMutation({
    mutationFn: ({ id, tipo }: { id: number; tipo: AccionPedido }) => ejecutarAccionPedido(id, tipo),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: claves.pedidos.todos });
      void queryClient.invalidateQueries({ queryKey: claves.pagos.todos });
      void invalidarMenu(queryClient);
      setCancelar(null);
      toast.exito(
        variables.tipo === 'cancelar'
          ? 'Pedido cancelado.'
          : variables.tipo === 'extender-plazo'
            ? 'Le diste más tiempo al cliente.'
            : 'Pedido actualizado.',
      );
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion="Confirma, prepara y entrega los pedidos. En domicilio, el comprador confirma la recepción; en retiro, tú entregas y cobras en el puesto."
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
            {OPCIONES_FILTRO_PEDIDO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
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
          <div className="entra-lista space-y-3">
            {pedidos.data.results.map((pedido) => {
              const siguientePermitido = siguienteAccion(pedido, 'vendedor');
              const puedeCancelar = pedido.acciones_permitidas?.includes('cancelar');
              const Icono = siguientePermitido ? ICONOS_SIGUIENTE[siguientePermitido.icono] : null;
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
                    {pedido.tiene_encargo && pedido.fecha_solicitada && (
                      <>
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Encargo · {formatearFechaHora(pedido.fecha_solicitada)}
                        </p>
                        <ul className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                          {pedido.items
                            .filter((item) => item.modalidad === 'encargo')
                            .map((item) => (
                              <li key={item.id} className="whitespace-pre-line break-words">
                                <span className="font-medium">{item.cantidad}× {item.nombre_producto}</span>
                                {item.detalles ? `: ${item.detalles}` : ''}
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                    {pedido.vence_en && (
                      <p
                        className={`mt-1 text-xs ${
                          estaPorVencer(pedido.vence_en, ahora)
                            ? 'font-semibold text-[#A62F11] dark:text-orange-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Vence el {formatearFechaHora(pedido.vence_en)} · {textoCuentaRegresiva(pedido.vence_en, ahora).toLowerCase()}
                      </p>
                    )}
                    {pedido.estado === 'listo_para_recoger' && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {pedido.acciones_permitidas?.includes('confirmar-pago')
                          ? 'Esperando al cliente en el puesto. Entrega el pedido y cobra en efectivo.'
                          : 'Esperando al cliente en el puesto. Entrega el pedido cuando llegue.'}
                      </p>
                    )}
                    {pedido.estado === 'en_camino' && (
                      <p className={`mt-1 text-xs ${pedido.no_recibido_en ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {pedido.no_recibido_en
                          ? 'El comprador reportó que no le ha llegado. Espera la resolución del administrador.'
                          : 'Esperando que el comprador confirme la recepción.'}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold">{formatearMoneda(pedido.total)}</p>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link to={`/pedidos/${pedido.id}`} className="btn-secondary py-1.5 text-xs">
                      Ver detalle <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {siguientePermitido && Icono && (
                      <button
                        type="button"
                        className="btn-primary py-1.5 text-xs"
                        onClick={() => accion.mutate({ id: pedido.id, tipo: siguientePermitido.accion })}
                        disabled={accion.isPending}
                      >
                        <Icono className="h-3.5 w-3.5" /> {siguientePermitido.etiqueta}
                      </button>
                    )}
                    <BotonDarMasTiempo
                      pedido={pedido}
                      cargando={accion.isPending && accion.variables?.id === pedido.id && accion.variables.tipo === 'extender-plazo'}
                      onClick={() => accion.mutate({ id: pedido.id, tipo: 'extender-plazo' })}
                      className="btn-secondary py-1.5 text-xs"
                    />
                    {puedeCancelar && (
                      <button
                        type="button"
                        className="btn-ghost py-1.5 text-xs text-rose-600 dark:text-rose-400"
                        onClick={() => {
                          setCancelar(pedido.id);
                          setCancelaEncargo(Boolean(pedido.tiene_encargo) && pedido.estado === 'pendiente');
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" /> {pedido.tiene_encargo && pedido.estado === 'pendiente' ? 'No puedo hacerlo' : 'Cancelar'}
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
        titulo={cancelaEncargo ? '¿No puedes hacer este encargo?' : '¿Cancelar este pedido?'}
        descripcion={
          cancelaEncargo
            ? 'Se cancelará el encargo y, si el cliente ya pagó, se le devolverá el pago.'
            : 'Se repondrá el stock. Si hay un pago aprobado, quedará pendiente de reembolso.'
        }
        textoConfirmar={cancelaEncargo ? 'Cancelar encargo' : 'Cancelar pedido'}
        cargando={accion.isPending}
        onConfirmar={() => cancelar && accion.mutate({ id: cancelar, tipo: 'cancelar' })}
        onCerrar={() => setCancelar(null)}
      />
    </div>
  );
}
