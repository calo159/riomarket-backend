import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Store,
  XCircle,
} from 'lucide-react';
import { ejecutarAccionPedido, obtenerPedido, reportarNoRecibido, type AccionPedido } from '../api/orders';
import { confirmarEfectivo, crearPago, listarPagos, simularPago } from '../api/payments';
import { crearResena, listarResenas } from '../api/reviews';
import { useSession } from '../auth/SessionProvider';
import { useToast } from '../components/ui/Toast';
import { EtiquetaEstado } from '../components/ui/EtiquetaEstado';
import { Estrellas } from '../components/ui/Estrellas';
import { CargandoPantalla, EstadoError } from '../components/ui/Estado';
import { ConfirmarModal, Modal } from '../components/ui/Modal';
import { Campo, ErrorCampo } from '../components/ui/Campos';
import { formatearFechaHora, formatearMoneda, ETIQUETAS_PAGO, ETIQUETAS_PEDIDO } from '../lib/format';
import { erroresDeCampo, mensajeDeError } from '../lib/errors';
import { cn } from '../lib/utils';

const PASOS = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
const SANDBOX_PAGOS = import.meta.env.VITE_SANDBOX_PAGOS === 'true';

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
  const [motivoNoRecibido, setMotivoNoRecibido] = useState('');
  const [modalPago, setModalPago] = useState(false);
  const [metodo, setMetodo] = useState(SANDBOX_PAGOS ? 'simulado' : 'efectivo');
  const [errorPago, setErrorPago] = useState('');
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [errorResena, setErrorResena] = useState('');

  const pedido = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => obtenerPedido(id!),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });

  const pagos = useQuery({
    queryKey: ['pagos', 'pedido', id],
    queryFn: () => listarPagos({ pedido: id!, page_size: 20 }),
    enabled: Boolean(id),
  });

  const resenas = useQuery({
    queryKey: ['resenas', 'puesto', pedido.data?.id_puesto],
    queryFn: () => listarResenas({ puesto: pedido.data!.id_puesto, page_size: 50 }),
    enabled: Boolean(pedido.data?.id_puesto),
  });

  useEffect(() => {
    if (pedido.data) document.title = `Pedido #${pedido.data.id} · RioMarket`;
  }, [pedido.data]);

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ['pedido', id] });
    void queryClient.invalidateQueries({ queryKey: ['pagos', 'pedido', id] });
    void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    void queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  const accion = useMutation({
    mutationFn: (tipo: AccionPedido) => ejecutarAccionPedido(Number(id), tipo),
    onSuccess: (_, tipo) => {
      invalidar();
      setConfirmarCancelar(false);
      setConfirmarEntregar(false);
      toast.exito(
        tipo === 'cancelar'
          ? 'Pedido cancelado y stock repuesto.'
          : tipo === 'entregar'
            ? '¡Listo! Confirmaste que recibiste el pedido.'
            : 'Estado del pedido actualizado.',
      );
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const noRecibido = useMutation({
    mutationFn: () => reportarNoRecibido(Number(id), motivoNoRecibido.trim()),
    onSuccess: () => {
      invalidar();
      setModalNoRecibido(false);
      setMotivoNoRecibido('');
      toast.exito('Avisamos al vendedor que tu pedido no te ha llegado.');
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const pagar = useMutation({
    mutationFn: async () => {
      const nuevo = await crearPago({ pedido: Number(id), metodo_pago: metodo });
      if (metodo === 'simulado') return simularPago(nuevo.id, 'aprobar');
      return nuevo;
    },
    onSuccess: (pago) => {
      invalidar();
      setModalPago(false);
      setErrorPago('');
      toast.exito(
        pago.estado === 'aprobado'
          ? 'Pago aprobado en modo sandbox.'
          : 'Pago registrado. Queda pendiente de confirmación.',
      );
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      setErrorPago(campos.metodo_pago?.[0] ?? campos.id_pedido?.[0] ?? mensajeDeError(error));
    },
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

  const resenar = useMutation({
    mutationFn: () =>
      crearResena({
        id_puesto: pedido.data!.id_puesto,
        id_pedido: pedido.data!.id,
        calificacion,
        comentario: comentario.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resenas'] });
      setComentario('');
      setErrorResena('');
      toast.exito('¡Gracias por tu reseña!');
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      setErrorResena(campos.__general?.[0] ?? campos.calificacion?.[0] ?? mensajeDeError(error));
    },
  });

  if (pedido.isLoading) return <CargandoPantalla />;
  if (pedido.isError || !pedido.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EstadoError mensaje="No encontramos el pedido o no tienes acceso a él." />
        <Link to="/mis-pedidos" className="btn-secondary mt-4">Volver a mis pedidos</Link>
      </div>
    );
  }

  const datos = pedido.data;
  const listaPagos = pagos.data?.results ?? [];
  const pagoVigente = listaPagos[0];
  const pagoAprobado = listaPagos.some((pago) => pago.estado === 'aprobado');
  const esComprador = usuario?.id === datos.id_comprador;
  const esVendedor = rol === 'vendedor';
  const esAdmin = rol === 'administrador';
  const puedePagar =
    datos.estado === 'pendiente' &&
    (esComprador || esAdmin) &&
    !pagoAprobado &&
    !listaPagos.some((pago) => ['pendiente', 'procesando'].includes(pago.estado));
  const pasoActual = PASOS.indexOf(datos.estado);
  const resenaPropia = resenas.data?.results.find((resena) => resena.id_pedido === datos.id && resena.id_usuario === usuario?.id);

  // RBAC: la API dice qué puede hacer ESTE usuario sobre ESTE pedido en su estado actual.
  const permitidas = datos.acciones_permitidas ?? [];
  const puedeCancelar = permitidas.includes('cancelar');
  const puedeEntregar = permitidas.includes('entregar');
  const puedeReportarNoRecibido = permitidas.includes('no-recibido');
  const puedeConfirmarEfectivo =
    (esVendedor || esAdmin) &&
    pagoVigente?.metodo_pago === 'efectivo' &&
    ['pendiente', 'procesando'].includes(pagoVigente.estado);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/mis-pedidos" className="btn-ghost -ml-2 mb-3">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      {esNuevo && datos.estado === 'pendiente' && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Tu pedido fue creado. Registra el pago para que el vendedor pueda confirmarlo.</p>
        </div>
      )}

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
          {puedePagar && (
            <button type="button" className="btn-primary" onClick={() => setModalPago(true)}>
              <CreditCard className="h-4 w-4" /> Pagar pedido
            </button>
          )}
          {puedeEntregar && (
            <button type="button" className="btn-primary" onClick={() => setConfirmarEntregar(true)}>
              <CheckCircle2 className="h-4 w-4" /> {esComprador ? 'Ya recibí mi pedido' : 'Marcar entregado'}
            </button>
          )}
          {puedeReportarNoRecibido && (
            <button
              type="button"
              className="btn-secondary text-amber-700 dark:text-amber-300"
              onClick={() => setModalNoRecibido(true)}
            >
              <AlertTriangle className="h-4 w-4" /> No me ha llegado
            </button>
          )}
          {puedeCancelar && (
            <button type="button" className="btn-secondary text-rose-600 dark:text-rose-400" onClick={() => setConfirmarCancelar(true)}>
              <XCircle className="h-4 w-4" /> Cancelar
            </button>
          )}
        </div>
      </div>

      {datos.estado === 'en_camino' && (
        <div
          className={cn(
            'mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm',
            datos.no_recibido_en
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
              : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
          )}
        >
          {datos.no_recibido_en ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Bike className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>
            {datos.no_recibido_en
              ? esComprador
                ? `Avisaste el ${formatearFechaHora(datos.no_recibido_en)} que no te ha llegado y ya notificamos al vendedor. Si el pedido llega, confírmalo con el botón de arriba.`
                : `El comprador reportó el ${formatearFechaHora(datos.no_recibido_en)} que no ha recibido el pedido.${datos.motivo_no_recibido ? ` Detalle: ${datos.motivo_no_recibido}` : ''}`
              : esComprador
                ? 'El vendedor ya entregó tu pedido al domiciliario o está listo para retirar. Cuando lo tengas en tus manos, confírmalo.'
                : 'Esperando que el comprador confirme que recibió el pedido.'}
          </p>
        </div>
      )}

      {datos.estado !== 'cancelado' && (
        <ol className="mt-6 grid gap-2 sm:grid-cols-5" aria-label="Estado del pedido">
          {PASOS.map((paso, indice) => {
            const alcanzado = indice <= pasoActual;
            return (
              <li key={paso} className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:text-center">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                    alcanzado
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 text-slate-400 dark:border-slate-700',
                  )}
                >
                  {indice + 1}
                </span>
                <span className={cn('text-xs font-medium', alcanzado ? 'text-brand-800 dark:text-brand-300' : 'text-slate-400')}>
                  {ETIQUETAS_PEDIDO[paso]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Package className="h-5 w-5" /> Productos</h2>
            <div className="mt-3 divide-y">
              {datos.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.nombre_producto}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatearMoneda(item.precio_unitario)} / {item.unidad_medida} × {item.cantidad}
                    </p>
                  </div>
                  <p className="font-semibold">{formatearMoneda(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              {datos.tipo_entrega === 'domicilio' ? <Bike className="h-5 w-5" /> : <Store className="h-5 w-5" />}
              Entrega
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Modalidad</dt>
                <dd className="font-medium">{datos.tipo_entrega === 'domicilio' ? 'Domicilio' : 'Retiro en el puesto'}</dd>
              </div>
              {datos.tipo_entrega === 'domicilio' && (
                <>
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Dirección</dt>
                    <dd className="font-medium">{datos.direccion_entrega || '—'}</dd>
                  </div>
                  {datos.referencia_entrega && (
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Referencia</dt>
                      <dd>{datos.referencia_entrega}</dd>
                    </div>
                  )}
                </>
              )}
              {datos.notas && (
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Notas</dt>
                  <dd className="whitespace-pre-line">{datos.notas}</dd>
                </div>
              )}
            </dl>
            <Link to={`/puestos/${datos.id_puesto}`} className="link mt-3 inline-flex items-center gap-1 text-sm">
              <MapPin className="h-4 w-4" /> Ver puesto
            </Link>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5" /> Pagos</h2>
            {pagos.isLoading && <p className="mt-2 text-sm text-slate-500">Cargando pagos…</p>}
            {!pagos.isLoading && listaPagos.length === 0 && (
              <p className="mt-3 rounded-xl border border-dashed px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
                Este pedido todavía no tiene un pago registrado.
              </p>
            )}
            <div className="mt-3 space-y-3">
              {listaPagos.map((pago) => (
                <div key={pago.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">Pago #{pago.id} · {pago.metodo_pago}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatearFechaHora(pago.fecha_creacion)}
                        {pago.referencia_gateway && ` · Ref. ${pago.referencia_gateway}`}
                      </p>
                    </div>
                    <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {ETIQUETAS_PAGO[pago.estado] ?? pago.estado}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    Total cobrado: <strong>{formatearMoneda(pago.total_cobrado)}</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SANDBOX_PAGOS && (esComprador || esAdmin) && ['pendiente', 'procesando'].includes(pago.estado) && (
                      <>
                        <button
                          type="button"
                          className="btn-primary py-1.5 text-xs"
                          onClick={() => simular.mutate({ idPago: pago.id, aprobar: true })}
                          disabled={simular.isPending}
                        >
                          Aprobar (sandbox)
                        </button>
                        <button
                          type="button"
                          className="btn-secondary py-1.5 text-xs"
                          onClick={() => simular.mutate({ idPago: pago.id, aprobar: false })}
                          disabled={simular.isPending}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {puedeConfirmarEfectivo && pago.id === pagoVigente?.id && (
                      <button
                        type="button"
                        className="btn-primary py-1.5 text-xs"
                        onClick={() => confirmarEfect.mutate(pago.id)}
                        disabled={confirmarEfect.isPending}
                      >
                        Confirmar cobro en efectivo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {puedePagar && (
              <button type="button" className="btn-primary mt-4" onClick={() => setModalPago(true)}>
                Registrar pago
              </button>
            )}
          </section>

          {datos.estado === 'entregado' && esComprador && (
            <section className="card p-5">
              <h2 className="text-lg font-bold">Reseña del puesto</h2>
              {resenaPropia ? (
                <div className="mt-2 text-sm">
                  <Estrellas valor={resenaPropia.calificacion} />
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {resenaPropia.comentario || 'Sin comentario.'}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">¿Cómo fue tu experiencia?</p>
                  <div className="mt-2">
                    <Estrellas valor={calificacion} interactivo onCambiar={setCalificacion} tamano="h-7 w-7" />
                  </div>
                  <Campo etiqueta="Comentario (opcional)" htmlFor="comentario" className="mt-3">
                    <textarea
                      id="comentario"
                      rows={3}
                      className="input resize-y"
                      value={comentario}
                      onChange={(evento) => setComentario(evento.target.value)}
                      placeholder="Cuéntanos qué tal estuvo el producto y la atención."
                    />
                  </Campo>
                  <ErrorCampo mensaje={errorResena} />
                  <button
                    type="button"
                    className="btn-primary mt-3"
                    onClick={() => resenar.mutate()}
                    disabled={resenar.isPending}
                  >
                    {resenar.isPending ? 'Enviando…' : 'Publicar reseña'}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Resumen</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Subtotal</dt><dd>{formatearMoneda(datos.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Domicilio</dt><dd>{formatearMoneda(datos.tarifa_domicilio)}</dd></div>
            {Number(datos.descuento_cupon) > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>Descuento</dt><dd>− {formatearMoneda(datos.descuento_cupon)}</dd></div>
            )}
          </dl>
          <div className="my-3 border-t" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{formatearMoneda(datos.total)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Estado del pago:{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              {pagoAprobado ? 'aprobado' : pagoVigente ? ETIQUETAS_PAGO[pagoVigente.estado] ?? pagoVigente.estado : 'sin registrar'}
            </strong>
          </p>
          {datos.estado === 'pendiente' && pagoAprobado && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <Clock className="mr-1 inline h-3.5 w-3.5" /> El vendedor confirmará tu pedido cuando revise el pago.
            </p>
          )}
        </aside>
      </div>

      <ConfirmarModal
        abierto={confirmarCancelar}
        titulo="¿Cancelar este pedido?"
        descripcion="Se repondrá el stock de los productos. Si el pago estaba aprobado, se marcará para reembolso."
        textoConfirmar="Cancelar pedido"
        cargando={accion.isPending}
        onConfirmar={() => accion.mutate('cancelar')}
        onCerrar={() => setConfirmarCancelar(false)}
      />

      <ConfirmarModal
        abierto={confirmarEntregar}
        titulo="¿Marcar el pedido como entregado?"
        descripcion={
          esComprador
            ? 'Confirma solo si ya tienes tu pedido en las manos.'
            : 'Confirma solo si tienes certeza de que el comprador recibió el pedido.'
        }
        textoConfirmar={esComprador ? 'Sí, ya lo recibí' : 'Sí, fue entregado'}
        peligro={false}
        cargando={accion.isPending}
        onConfirmar={() => accion.mutate('entregar')}
        onCerrar={() => setConfirmarEntregar(false)}
      />

      <Modal abierto={modalNoRecibido} onCerrar={() => setModalNoRecibido(false)} titulo="No me ha llegado">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Le avisaremos al vendedor que tu pedido sigue sin llegar. El pedido seguirá en camino y podrás confirmarlo cuando lo recibas.
        </p>
        <Campo etiqueta="¿Qué pasó? (opcional)" htmlFor="motivo-no-recibido" className="mt-4">
          <textarea
            id="motivo-no-recibido"
            rows={3}
            maxLength={200}
            className="input resize-y"
            value={motivoNoRecibido}
            onChange={(evento) => setMotivoNoRecibido(evento.target.value)}
            placeholder="Ej. El domiciliario no contesta."
          />
        </Campo>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setModalNoRecibido(false)}>
            Volver
          </button>
          <button type="button" className="btn-primary" onClick={() => noRecibido.mutate()} disabled={noRecibido.isPending}>
            {noRecibido.isPending ? 'Enviando…' : 'Avisar al vendedor'}
          </button>
        </div>
      </Modal>

      <Modal abierto={modalPago} onCerrar={() => setModalPago(false)} titulo="Registrar pago">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Total a pagar: <strong>{formatearMoneda(datos.total)}</strong>
        </p>
        <Campo etiqueta="Método de pago" htmlFor="metodo-pago" className="mt-4">
          <select id="metodo-pago" className="input" value={metodo} onChange={(evento) => setMetodo(evento.target.value)}>
            {SANDBOX_PAGOS && <option value="simulado">Simulado (sandbox, se aprueba al instante)</option>}
            <option value="efectivo">Efectivo (lo confirma el vendedor)</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta débito/crédito</option>
            <option value="nequi">Nequi</option>
            <option value="daviplata">Daviplata</option>
          </select>
        </Campo>
        <ErrorCampo mensaje={errorPago} />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setModalPago(false)} disabled={pagar.isPending}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => pagar.mutate()} disabled={pagar.isPending}>
            {pagar.isPending ? 'Procesando…' : 'Registrar pago'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
