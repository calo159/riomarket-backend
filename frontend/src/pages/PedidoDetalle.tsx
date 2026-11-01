import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, CreditCard, XCircle } from 'lucide-react';
import { ejecutarAccionPedido, obtenerPedido, type AccionPedido } from '../api/orders';
import { confirmarEfectivo, listarPagos, simularPago } from '../api/payments';
import { listarResenas } from '../api/reviews';
import { useSession } from '../auth/SessionProvider';
import { useToast } from '../components/ui/Toast';
import { EtiquetaEstado } from '../components/ui/EtiquetaEstado';
import { CargandoPantalla, EstadoError } from '../components/ui/Estado';
import { ConfirmarModal } from '../components/ui/Modal';
import { BotonVolverAPedir } from '../components/BotonVolverAPedir';
import { formatearFechaHora } from '../lib/format';
import { esErrorTemporal, mensajeDeCarga, mensajeDeError } from '../lib/errors';
import { invalidarMenu } from '../navigation/useMenu';
import { claves } from '../lib/queryKeys';
import { AvisosPedido } from './pedido/AvisosPedido';
import { BotonDarMasTiempo } from './pedido/BotonDarMasTiempo';
import { PasosPedido } from './pedido/PasosPedido';
import { EntregaPedido, ProductosPedido } from './pedido/ProductosEntregaPedido';
import { PagosPedido } from './pedido/PagosPedido';
import { ResenaPedido } from './pedido/ResenaPedido';
import { ResumenPedido } from './pedido/ResumenPedido';
import { ModalNoRecibido, ModalPago } from './pedido/ModalesPedido';
import { SANDBOX_PAGOS } from './pedido/config';

export function PedidoDetalle() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const esNuevo = params.get('nuevo') === '1';
  const { usuario, rol } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [confirmarEntregar, setConfirmarEntregar] = useState(false);
  const [modalNoRecibido, setModalNoRecibido] = useState(false);
  const [modalPago, setModalPago] = useState(false);

  const pedido = useQuery({
    queryKey: claves.pedido(id),
    queryFn: () => obtenerPedido(id!),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });

  const pagos = useQuery({
    queryKey: claves.pagos.deUnPedido(id),
    queryFn: () => listarPagos({ pedido: id!, page_size: 20 }),
    enabled: Boolean(id),
  });

  const resenas = useQuery({
    queryKey: claves.resenas.deUnPuesto(pedido.data?.id_puesto),
    queryFn: () => listarResenas({ puesto: pedido.data!.id_puesto, page_size: 50 }),
    enabled: Boolean(pedido.data?.id_puesto),
  });

  useEffect(() => {
    if (pedido.data) document.title = `Pedido #${pedido.data.id} · RioMarket`;
  }, [pedido.data]);

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: claves.pedido(id) });
    void queryClient.invalidateQueries({ queryKey: claves.pagos.deUnPedido(id) });
    void queryClient.invalidateQueries({ queryKey: claves.pedidos.todos });
    void queryClient.invalidateQueries({ queryKey: claves.notificaciones.todos });
    void invalidarMenu(queryClient);
  };

  const accion = useMutation({
    mutationFn: (tipo: AccionPedido) => ejecutarAccionPedido(Number(id), tipo),
    onSuccess: (_, tipo) => {
      invalidar();
      setConfirmarCancelar(false);
      setConfirmarEntregar(false);
      toast.exito(
        tipo === 'cancelar'
          ? pedido.data?.tiene_encargo
            ? 'Pedido cancelado.'
            : 'Pedido cancelado y stock repuesto.'
          : tipo === 'entregar'
            ? 'Pedido marcado como entregado.'
            : tipo === 'extender-plazo'
              ? 'Le diste más tiempo al cliente.'
              : 'Estado del pedido actualizado.',
      );
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const simular = useMutation({
    mutationFn: ({ idPago, aprobar }: { idPago: number; aprobar: boolean }) =>
      simularPago(idPago, aprobar ? 'aprobar' : 'rechazar'),
    onSuccess: (pago) => {
      invalidar();
      toast.exito(pago.estado === 'aprobado' ? 'Pago aprobado.' : 'Pago rechazado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const confirmarEfect = useMutation({
    mutationFn: (idPago: number) => confirmarEfectivo(idPago),
    onSuccess: () => {
      invalidar();
      toast.exito('Pago en efectivo confirmado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  if (pedido.isLoading) return <CargandoPantalla />;
  if (pedido.isError || !pedido.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EstadoError
          mensaje={mensajeDeCarga(pedido.error, "No encontramos el pedido o no tienes acceso a él.")}
          onReintentar={esErrorTemporal(pedido.error) ? () => void pedido.refetch() : undefined}
        />
        <Link to="/mis-pedidos" className="btn-secondary mt-4">Volver a mis pedidos</Link>
      </div>
    );
  }

  const datos = pedido.data;
  const listaPagos = pagos.data?.results ?? [];
  const pagoVigente = listaPagos[0];
  const pagoAprobado = listaPagos.some((pago) => pago.estado === 'aprobado');
  const esComprador = usuario?.id === datos.id_comprador;
  const esAdmin = rol === 'administrador';
  // Quién puede pagar o cobrar lo decide el backend (acciones_permitidas), no el rol.
  const permitidas = datos.acciones_permitidas ?? [];
  const puedePagar = permitidas.includes('pagar') && !pagoAprobado;
  const resenaPropia = resenas.data?.results.find((resena) => resena.id_pedido === datos.id && resena.id_usuario === usuario?.id);

  const puedeCancelar = permitidas.includes('cancelar');
  // Un vendedor que no puede hacer un encargo pendiente lo cancela con «No puedo hacerlo».
  const rechazaEncargo = Boolean(datos.tiene_encargo) && !esComprador && datos.estado === 'pendiente';
  const puedeEntregar = permitidas.includes('entregar');
  const puedeReportar = permitidas.includes('no-recibido') && !datos.no_recibido_en;
  const puedeConfirmarEfectivo = permitidas.includes('confirmar-pago');
  const esRetiro = datos.tipo_entrega === 'retiro';
  // Retiro con efectivo sin cobrar: quien entrega (vendedor o admin) también cobra en mano.
  const entregaCobrando = esRetiro && puedeEntregar && puedeConfirmarEfectivo;
  const efectivoPendiente =
    pagoVigente?.metodo_pago === 'efectivo' && ['pendiente', 'procesando'].includes(pagoVigente.estado);
  const etiquetaEntregar = esComprador
    ? esRetiro
      ? 'Ya recogí mi pedido'
      : 'Ya recibí mi pedido'
    : entregaCobrando
      ? 'Entregar y cobrar'
      : 'Marcar entregado';

  return (
    <div className="mx-auto max-w-[1240px] px-3 py-5 sm:px-5">
      <Link to="/mis-pedidos" className="btn-ghost -ml-2 mb-3">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <AvisosPedido datos={datos} esNuevo={esNuevo} esComprador={esComprador} efectivoPendiente={efectivoPendiente} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">Pedido #{datos.id}</h1>
            <EtiquetaEstado estado={datos.estado} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Creado el {formatearFechaHora(datos.fecha_creacion)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {esComprador && <BotonVolverAPedir pedido={datos} />}
          {puedePagar && (
            <button type="button" className="btn-primary" onClick={() => setModalPago(true)}>
              <CreditCard className="h-4 w-4" /> Pagar pedido
            </button>
          )}
          {puedeEntregar && (
            <button type="button" className="btn-primary" onClick={() => setConfirmarEntregar(true)}>
              <CheckCircle2 className="h-4 w-4" /> {etiquetaEntregar}
            </button>
          )}
          <BotonDarMasTiempo
            pedido={datos}
            cargando={accion.isPending && accion.variables === 'extender-plazo'}
            onClick={() => accion.mutate('extender-plazo')}
          />
          {puedeReportar && (
            <button
              type="button"
              className="btn-secondary text-amber-700 dark:text-amber-300"
              onClick={() => setModalNoRecibido(true)}
            >
              <Clock className="h-4 w-4" /> No me ha llegado
            </button>
          )}
          {puedeCancelar && (
            <button type="button" className="btn-secondary text-rose-600 dark:text-rose-400" onClick={() => setConfirmarCancelar(true)}>
              <XCircle className="h-4 w-4" /> {rechazaEncargo ? 'No puedo hacerlo' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>

      <PasosPedido estado={datos.estado} tipoEntrega={datos.tipo_entrega} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <ProductosPedido datos={datos} />
          <EntregaPedido datos={datos} />
          <PagosPedido
            cargando={pagos.isLoading}
            pagos={listaPagos}
            pagoVigente={pagoVigente}
            sandbox={SANDBOX_PAGOS}
            puedeSimular={esComprador || esAdmin}
            puedeConfirmarEfectivo={puedeConfirmarEfectivo}
            puedePagar={puedePagar}
            simulando={simular.isPending}
            confirmando={confirmarEfect.isPending}
            onSimular={(idPago, aprobar) => simular.mutate({ idPago, aprobar })}
            onConfirmarEfectivo={(idPago) => confirmarEfect.mutate(idPago)}
            onPagar={() => setModalPago(true)}
          />
          {datos.estado === 'entregado' && esComprador && <ResenaPedido datos={datos} resenaPropia={resenaPropia} />}
        </div>

        <ResumenPedido datos={datos} estadoPagoVigente={pagoVigente?.estado} pagoAprobado={pagoAprobado} />
      </div>

      <ConfirmarModal
        abierto={confirmarCancelar}
        titulo={rechazaEncargo ? '¿No puedes hacer este encargo?' : '¿Cancelar este pedido?'}
        descripcion={
          rechazaEncargo
            ? 'Se cancelará el encargo y, si el cliente ya pagó, se le devolverá el pago.'
            : datos.tiene_encargo
              ? 'Se repondrá el stock de los productos con existencias; los encargos no usan stock. Si el pago estaba aprobado, se marcará para reembolso.'
              : 'Se repondrá el stock de los productos. Si el pago estaba aprobado, se marcará para reembolso.'
        }
        textoConfirmar={rechazaEncargo ? 'Cancelar encargo' : 'Cancelar pedido'}
        cargando={accion.isPending}
        onConfirmar={() => accion.mutate('cancelar')}
        onCerrar={() => setConfirmarCancelar(false)}
      />

      <ConfirmarModal
        abierto={confirmarEntregar}
        titulo={
          esComprador
            ? esRetiro
              ? '¿Ya recogiste tu pedido?'
              : '¿Ya recibiste tu pedido?'
            : entregaCobrando
              ? '¿Entregar el pedido y cobrar?'
              : '¿Marcar el pedido como entregado?'
        }
        descripcion={
          esComprador
            ? 'Confirma solo si ya tienes el pedido en tus manos. Después podrás calificar el puesto.'
            : entregaCobrando
              ? 'Confirmas que entregaste el pedido y que cobraste el efectivo. El pago quedará aprobado.'
              : esRetiro
                ? 'Confirmas que el cliente ya recogió su pedido en el puesto.'
                : 'Como administrador, usa esta acción para resolver una disputa cuando el comprador no puede confirmar.'
        }
        textoConfirmar={esComprador ? (esRetiro ? 'Sí, lo recogí' : 'Sí, lo recibí') : entregaCobrando ? 'Sí, entregar y cobrar' : 'Sí, fue entregado'}
        peligro={false}
        cargando={accion.isPending}
        onConfirmar={() => accion.mutate('entregar')}
        onCerrar={() => setConfirmarEntregar(false)}
      />

      <ModalNoRecibido
        abierto={modalNoRecibido}
        onCerrar={() => setModalNoRecibido(false)}
        pedidoId={Number(id)}
        onExito={invalidar}
      />

      <ModalPago
        abierto={modalPago}
        onCerrar={() => setModalPago(false)}
        pedidoId={Number(id)}
        onExito={invalidar}
        total={datos.total}
        tipoEntrega={datos.tipo_entrega}
      />
    </div>
  );
}
