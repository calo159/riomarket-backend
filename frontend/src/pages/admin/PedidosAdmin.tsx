import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, ClipboardList, Package, Truck, XCircle } from 'lucide-react';
import { ejecutarAccionPedido, listarPedidos, type AccionPedido } from '../../api/orders';
import { EncabezadoPagina } from '../../components/ui/Encabezado';
import { EtiquetaEstado } from '../../components/ui/EtiquetaEstado';
import { CargandoBloque, EstadoError, EstadoVacio } from '../../components/ui/Estado';
import { Paginacion } from '../../components/ui/Paginacion';
import { ConfirmarModal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatearFechaHora, formatearMoneda } from '../../lib/format';
import { mensajeDeError } from '../../lib/errors';
import { invalidarMenu } from '../../navigation/useMenu';

const TAMANO = 15;

const SIGUIENTE: Record<string, { accion: AccionPedido; etiqueta: string; icono: typeof CheckCircle2 } | null> = {
  pendiente: { accion: 'confirmar', etiqueta: 'Confirmar', icono: CheckCircle2 },
  confirmado: { accion: 'en-preparacion', etiqueta: 'En preparación', icono: Package },
  en_preparacion: { accion: 'enviar', etiqueta: 'En camino', icono: Truck },
  en_camino: { accion: 'entregar', etiqueta: 'Marcar entregado', icono: CheckCircle2 },
  entregado: null,
  cancelado: null,
};

export function PedidosAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagina, setPagina] = useState(1);
  const [cancelar, setCancelar] = useState<number | null>(null);
  const estado = searchParams.get('estado') ?? '';
  const soloNoRecibidos = searchParams.get('con_no_recibido') === 'true';

  const cambiarFiltro = (clave: 'estado' | 'con_no_recibido', valor: string) => {
    const siguiente = new URLSearchParams(searchParams);
    if (valor) siguiente.set(clave, valor);
    else siguiente.delete(clave);
    setSearchParams(siguiente, { replace: true });
    setPagina(1);
  };

  useEffect(() => {
    document.title = 'Pedidos �� Administraci��n �� RioMarket';
  }, []);

  const pedidos = useQuery({
    queryKey: ['pedidos', 'admin', pagina, estado, soloNoRecibidos],
    queryFn: () =>
      listarPedidos({
        page: pagina,
        page_size: TAMANO,
        estado: estado || undefined,
        con_no_recibido: soloNoRecibidos ? true : undefined,
      }),
    placeholderData: (anterior) => anterior,
  });

  const accion = useMutation({
    mutationFn: ({ id, tipo }: { id: number; tipo: AccionPedido }) => ejecutarAccionPedido(id, tipo),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      void queryClient.invalidateQueries({ queryKey: ['pagos'] });
      void invalidarMenu(queryClient);
      setCancelar(null);
      toast.exito(variables.tipo === 'cancelar' ? 'Pedido cancelado.' : 'Pedido actualizado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <div>
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion="Todos los pedidos de la plataforma y sus transiciones."
        acciones={
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input w-auto"
              value={estado}
              onChange={(evento) => cambiarFiltro('estado', evento.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmado">Confirmados</option>
              <option value="en_preparacion">En preparaci��n</option>
              <option value="en_camino">En camino</option>
              <option value="entregado">Entregados</option>
              <option value="cancelado">Cancelados</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soloNoRecibidos}
                onChange={(evento) =>
                  cambiarFiltro('con_no_recibido', evento.target.checked ? 'true' : '')
                }
              />
              Solo con reporte de no recibido
            </label>
          </div>
        }
      />

      {pedidos.isLoading && <CargandoBloque mensaje="Cargando pedidos…" />}
      {pedidos.isError && <EstadoError mensaje="No pudimos cargar los pedidos." onReintentar={() => void pedidos.refetch()} />}
      {pedidos.data && pedidos.data.results.length === 0 && (
        <EstadoVacio
          titulo="Sin pedidos"
          descripcion="No hay pedidos que coincidan con el filtro."
          icono={<ClipboardList className="h-9 w-9" />}
        />
      )}
      {pedidos.data && pedidos.data.results.length > 0 && (
        <>
          <div className="space-y-3">
            {pedidos.data.results.map((pedido) => {
              const siguiente = SIGUIENTE[pedido.estado];
              const siguientePermitido = siguiente && pedido.acciones_permitidas?.includes(siguiente.accion) ? siguiente : null;
              const puedeCancelar = pedido.acciones_permitidas?.includes('cancelar');
              const Icono = siguientePermitido?.icono;
              return (
                <article key={pedido.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/pedidos/${pedido.id}`} className="font-semibold hover:text-brand-700 dark:hover:text-brand-300">
                        Pedido #{pedido.id}
                      </Link>
                      <EtiquetaEstado estado={pedido.estado} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {pedido.tipo_entrega === 'domicilio' ? 'Domicilio' : 'Retiro'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {formatearFechaHora(pedido.fecha_creacion)} · {pedido.items.length}{' '}
                      {pedido.items.length === 1 ? 'producto' : 'productos'} · Puesto #{pedido.id_puesto}
                    </p>
                    {pedido.estado === 'en_camino' && pedido.no_recibido_en && (
                      <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                        Disputa: el comprador reportó que no le llegó el {formatearFechaHora(pedido.no_recibido_en)}.
                        {pedido.motivo_no_recibido ? ` Motivo: ${pedido.motivo_no_recibido}.` : ''} Revisa y resuelve con "Marcar entregado" o cancela/reembolsa.
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
