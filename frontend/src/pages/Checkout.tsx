import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Bike,
  CheckCircle2,
  MapPin,
  Store,
  Ticket,
  Trash2,
} from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { useSession } from '../auth/SessionProvider';
import { useToast } from '../components/ui/Toast';
import { EncabezadoPagina } from '../components/ui/Encabezado';
import { CargandoPantalla, EstadoVacio } from '../components/ui/Estado';
import { Campo } from '../components/ui/Campos';
import { formatearMoneda } from '../lib/format';
import { erroresDeCampo, mensajeDeError } from '../lib/errors';
import { crearPedido, type DatosPedido } from '../api/orders';
import { validarCupon } from '../api/coupons';
import { listarDirecciones } from '../api/addresses';
import { obtenerPuesto } from '../api/catalog';
import type { RespuestaValidarCupon } from '../lib/types';

const TARIFA_DOMICILIO = Number(import.meta.env.VITE_TARIFA_DOMICILIO ?? 3000);

export function Checkout() {
  const { carrito, subtotal, vaciar } = useCart();
  const { usuario } = useSession();
  const navigate = useNavigate();
  const toast = useToast();

  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'domicilio'>('retiro');
  const [modoDireccion, setModoDireccion] = useState<'guardada' | 'manual'>('manual');
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cupon, setCupon] = useState<RespuestaValidarCupon | null>(null);
  const [errorCupon, setErrorCupon] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Finalizar compra · RioMarket';
  }, []);

  const puesto = useQuery({
    queryKey: ['puesto', carrito?.puestoId],
    queryFn: () => obtenerPuesto(carrito!.puestoId),
    enabled: Boolean(carrito?.puestoId),
  });

  const direcciones = useQuery({
    queryKey: ['direcciones'],
    queryFn: listarDirecciones,
  });

  useEffect(() => {
    if (!direcciones.data?.length) {
      setModoDireccion('manual');
      return;
    }
    const predeterminada = direcciones.data.find((item) => item.es_predeterminada) ?? direcciones.data[0];
    setDireccionId(predeterminada.id);
    setDireccion(predeterminada.direccion);
    setReferencia(predeterminada.referencia ?? '');
    setModoDireccion('guardada');
  }, [direcciones.data]);

  useEffect(() => {
    if (puesto.data && !puesto.data.ofrece_domicilio) setTipoEntrega('retiro');
  }, [puesto.data]);

  const validar = useMutation({
    mutationFn: () =>
      validarCupon({
        codigo: codigoCupon.trim(),
        id_puesto: carrito!.puestoId,
        subtotal: subtotal.toFixed(2),
      }),
    onSuccess: (data) => {
      setCupon(data);
      setErrorCupon('');
    },
    onError: (error) => {
      setCupon(null);
      const campos = erroresDeCampo(error);
      setErrorCupon(campos.codigo?.[0] ?? campos.__general?.[0] ?? mensajeDeError(error, 'El cupón no es válido.'));
    },
  });

  const crear = useMutation({
    mutationFn: (datos: DatosPedido) => crearPedido(datos),
    onSuccess: (pedido) => {
      vaciar();
      toast.exito('¡Pedido creado! Ahora puedes registrar el pago.');
      navigate(`/pedidos/${pedido.id}?nuevo=1`);
    },
    onError: (error) => {
      const campos = erroresDeCampo(error);
      const nuevos: Record<string, string> = {};
      for (const [campo, mensajes] of Object.entries(campos)) {
        nuevos[campo] = mensajes[0];
      }
      setErrores(nuevos);
      toast.error(mensajeDeError(error, 'No pudimos crear el pedido.'));
    },
  });

  const descuento = cupon ? Number(cupon.descuento) : 0;
  const tarifa = tipoEntrega === 'domicilio' ? TARIFA_DOMICILIO : 0;
  const total = Math.max(0, subtotal + tarifa - descuento);

  const items = useMemo(
    () => carrito?.items.map((item) => ({ id_producto: item.productoId, cantidad: item.cantidad })) ?? [],
    [carrito],
  );

  if (!carrito || carrito.items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <EncabezadoPagina titulo="Finalizar compra" />
        <EstadoVacio
          titulo="No hay productos para pagar"
          descripcion="Agrega productos al carrito antes de continuar."
          accion={<Link to="/catalogo" className="btn-primary">Ir al catálogo</Link>}
        />
      </div>
    );
  }

  if (puesto.isLoading) return <CargandoPantalla />;

  const enviar = () => {
    if (!usuario) return;
    const nuevos: Record<string, string> = {};
    if (tipoEntrega === 'domicilio') {
      if (modoDireccion === 'manual' && !direccion.trim()) nuevos.direccion_entrega = 'Escribe la dirección de entrega.';
      if (modoDireccion === 'guardada' && !direccionId) nuevos.direccion_entrega = 'Selecciona una dirección.';
    }
    if (Object.keys(nuevos).length) {
      setErrores(nuevos);
      return;
    }
    setErrores({});
    crear.mutate({
      id_puesto: carrito.puestoId,
      tipo_entrega: tipoEntrega,
      direccion_entrega: tipoEntrega === 'domicilio' ? (modoDireccion === 'manual' ? direccion.trim() : undefined) : undefined,
      referencia_entrega: tipoEntrega === 'domicilio' && modoDireccion === 'manual' ? referencia.trim() || undefined : undefined,
      id_direccion: tipoEntrega === 'domicilio' && modoDireccion === 'guardada' ? direccionId : null,
      notas: notas.trim() || undefined,
      items,
      codigo_cupon: cupon?.codigo,
    });
  };

  const ofreceDomicilio = puesto.data?.ofrece_domicilio ?? carrito.ofreceDomicilio;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <EncabezadoPagina titulo="Finalizar compra" descripcion="Revisa la entrega y confirma tu pedido." />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-lg font-bold">1. Tipo de entrega</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipoEntrega('retiro')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                  tipoEntrega === 'retiro' ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40' : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Store className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Retiro en el puesto</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Sin costo adicional.</p>
                </div>
              </button>
              <button
                type="button"
                disabled={!ofreceDomicilio}
                onClick={() => setTipoEntrega('domicilio')}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  tipoEntrega === 'domicilio' ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40' : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Bike className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Domicilio</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {ofreceDomicilio ? `Tarifa: ${formatearMoneda(TARIFA_DOMICILIO)}` : 'Este puesto no ofrece domicilio.'}
                  </p>
                </div>
              </button>
            </div>

            {tipoEntrega === 'retiro' && puesto.data && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
                <p className="font-semibold">{puesto.data.nombre}</p>
                <p className="mt-1 flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4" /> {puesto.data.direccion}
                </p>
                {puesto.data.horario && <p className="mt-1 text-slate-500 dark:text-slate-400">Horario: {puesto.data.horario}</p>}
              </div>
            )}
          </section>

          {tipoEntrega === 'domicilio' && (
            <section className="card p-5">
              <h2 className="text-lg font-bold">2. Dirección de entrega</h2>
              {direcciones.data && direcciones.data.length > 0 && (
                <div className="mt-3 space-y-2">
                  {direcciones.data.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                        modoDireccion === 'guardada' && direccionId === item.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="direccion"
                        className="mt-1 text-brand-600"
                        checked={modoDireccion === 'guardada' && direccionId === item.id}
                        onChange={() => {
                          setModoDireccion('guardada');
                          setDireccionId(item.id);
                          setDireccion(item.direccion);
                          setReferencia(item.referencia ?? '');
                        }}
                      />
                      <span className="text-sm">
                        <span className="font-semibold">{item.alias}</span>
                        {item.es_predeterminada && <span className="badge ml-2 bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">Predeterminada</span>}
                        <span className="mt-0.5 block text-slate-600 dark:text-slate-300">{item.direccion}</span>
                        {item.referencia && <span className="block text-xs text-slate-500 dark:text-slate-400">{item.referencia}</span>}
                      </span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setModoDireccion('manual');
                      setDireccionId(null);
                      setDireccion('');
                      setReferencia('');
                    }}
                    className={`w-full rounded-xl border border-dashed p-3 text-left text-sm font-medium ${
                      modoDireccion === 'manual' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    Usar otra dirección
                  </button>
                </div>
              )}

              {modoDireccion === 'manual' && (
                <div className="mt-3 space-y-3">
                  <Campo etiqueta="Dirección" htmlFor="direccion" error={errores.direccion_entrega}>
                    <input
                      id="direccion"
                      className="input"
                      placeholder="Calle 15 #8-32, barrio Centro"
                      value={direccion}
                      onChange={(evento) => setDireccion(evento.target.value)}
                    />
                  </Campo>
                  <Campo etiqueta="Referencia (opcional)" htmlFor="referencia">
                    <input
                      id="referencia"
                      className="input"
                      placeholder="Color de la casa, portón, punto de referencia"
                      value={referencia}
                      onChange={(evento) => setReferencia(evento.target.value)}
                    />
                  </Campo>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ¿Usas esta dirección seguido? Guárdala en{' '}
                    <Link to="/direcciones" className="link">tus direcciones</Link>.
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-lg font-bold">{tipoEntrega === 'domicilio' ? '3' : '2'}. Notas y cupón</h2>
            <Campo etiqueta="Notas para el vendedor (opcional)" htmlFor="notas" className="mt-3">
              <textarea
                id="notas"
                rows={3}
                className="input resize-y"
                placeholder="Ej. llamar al llegar, sin cebolla, etc."
                value={notas}
                onChange={(evento) => setNotas(evento.target.value)}
              />
            </Campo>
            <div className="mt-4">
              <label className="label" htmlFor="cupon">Cupón de descuento</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="cupon"
                    className="input pl-9 uppercase"
                    placeholder="CODIGO"
                    value={codigoCupon}
                    onChange={(evento) => {
                      setCodigoCupon(evento.target.value.toUpperCase());
                      setCupon(null);
                      setErrorCupon('');
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => validar.mutate()}
                  disabled={!codigoCupon.trim() || validar.isPending}
                >
                  {validar.isPending ? 'Validando…' : 'Aplicar'}
                </button>
              </div>
              {errorCupon && <p className="field-error">{errorCupon}</p>}
              {cupon && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Cupón aplicado: {formatearMoneda(cupon.descuento)} de descuento.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Tu pedido</h2>
          <div className="mt-3 space-y-2">
            {carrito.items.map((item) => (
              <div key={item.productoId} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.cantidad}×</span> {item.nombre}
                </span>
                <span className="shrink-0 font-medium">{formatearMoneda(Number(item.precio) * item.cantidad)}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><span>{formatearMoneda(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Domicilio</span><span>{tarifa ? formatearMoneda(tarifa) : '—'}</span></div>
            {descuento > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Descuento</span><span>− {formatearMoneda(descuento)}</span></div>
            )}
          </div>
          <div className="my-4 border-t" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{formatearMoneda(total)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            El servidor confirma los montos finales al crear el pedido. El pago se registra en el siguiente paso.
          </p>
          <button
            type="button"
            className="btn-primary mt-4 w-full py-3"
            onClick={enviar}
            disabled={crear.isPending}
          >
            {crear.isPending ? 'Creando pedido…' : 'Confirmar pedido'}
          </button>
          <Link to="/carrito" className="btn-ghost mt-2 w-full">
            <Trash2 className="h-4 w-4" /> Volver al carrito
          </Link>
        </aside>
      </div>
    </div>
  );
}
