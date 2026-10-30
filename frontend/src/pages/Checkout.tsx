import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  CheckCircle2,
  MapPin,
  Store,
  Ticket,
} from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { useSession } from '../auth/SessionProvider';
import { useToast } from '../components/ui/Toast';
import { CargandoPantalla, EstadoVacio } from '../components/ui/Estado';
import { Campo } from '../components/ui/Campos';
import { formatearMoneda } from '../lib/format';
import { erroresDeCampo, mensajeDeError } from '../lib/errors';
import { crearPedido, type DatosPedido } from '../api/orders';
import { validarCupon } from '../api/coupons';
import { crearDireccion, listarDirecciones } from '../api/addresses';
import { obtenerPuesto } from '../api/catalog';
import type { RespuestaValidarCupon } from '../lib/types';
import { claves } from '../lib/queryKeys';

const TARIFA_DOMICILIO = Number(import.meta.env.VITE_TARIFA_DOMICILIO || 3000);

export function Checkout() {
  const { carrito, subtotal, vaciar } = useCart();
  const { usuario } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'domicilio'>('retiro');
  const [modoDireccion, setModoDireccion] = useState<'guardada' | 'manual'>('manual');
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [alias, setAlias] = useState('');
  const [guardarEnLibreta, setGuardarEnLibreta] = useState(false);
  const [notas, setNotas] = useState('');
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cupon, setCupon] = useState<RespuestaValidarCupon | null>(null);
  const [errorCupon, setErrorCupon] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Finalizar compra · RioMarket';
  }, []);

  const puesto = useQuery({
    queryKey: claves.puesto(carrito?.puestoId),
    queryFn: () => obtenerPuesto(carrito!.puestoId),
    enabled: Boolean(carrito?.puestoId),
  });

  const direcciones = useQuery({
    queryKey: claves.direcciones,
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
    mutationFn: async (datos: DatosPedido) => {
      let idDireccion = datos.id_direccion;
      if (datos.tipo_entrega === 'domicilio' && modoDireccion === 'manual' && guardarEnLibreta) {
        const nueva = await crearDireccion({
          alias: alias.trim(),
          direccion: (datos.direccion_entrega ?? '').trim(),
          referencia: datos.referencia_entrega,
          es_predeterminada: (direcciones.data?.length ?? 0) === 0,
        });
        idDireccion = nueva.id;
      }
      return crearPedido({ ...datos, id_direccion: idDireccion });
    },
    onSuccess: (pedido) => {
      vaciar();
      if (guardarEnLibreta) void queryClient.invalidateQueries({ queryKey: claves.direcciones });
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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-5 text-3xl sm:text-4xl">Finalizar compra</h1>
        <EstadoVacio
          titulo="No hay productos para pagar"
          descripcion="Agrega productos a la canasta antes de continuar."
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
      if (modoDireccion === 'manual' && guardarEnLibreta && !alias.trim()) nuevos.alias = 'Ponle un nombre a la dirección guardada.';
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
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-8">
      <div className="mb-5">
        <p className="text-sm text-slate-700 dark:text-slate-300">Finalizar compra en</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">{carrito.puestoNombre}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-lg">Tipo de entrega</h2>
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
              <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm dark:bg-slate-800">
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
              <h2 className="text-lg">Dirección de entrega</h2>
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
                        {item.es_predeterminada && <span className="badge ml-2 bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100">Predeterminada</span>}
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
                      modoDireccion === 'manual' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-brand-600"
                      checked={guardarEnLibreta}
                      onChange={(evento) => {
                        setGuardarEnLibreta(evento.target.checked);
                        setErrores((valor) => {
                          if (evento.target.checked) return valor;
                          const resto = { ...valor };
                          delete resto.alias;
                          return resto;
                        });
                      }}
                    />
                    Guardar esta dirección en mi libreta
                  </label>
                  {guardarEnLibreta && (
                    <Campo etiqueta="Nombre corto" htmlFor="alias" error={errores.alias} ayuda="Ej. Casa, Trabajo, Casa de mamá.">
                      <input
                        id="alias"
                        className="input"
                        placeholder="Casa"
                        value={alias}
                        onChange={(evento) => setAlias(evento.target.value)}
                      />
                    </Campo>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-lg">Notas y cupón</h2>
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
                  <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
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
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-verde-700 dark:text-verde-400">
                  <CheckCircle2 className="h-4 w-4" /> Cupón aplicado: {formatearMoneda(cupon.descuento)} de descuento.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border-2 border-slate-900 p-5 dark:border-slate-300 lg:sticky lg:top-24">
          <h2 className="text-lg">Tu pedido</h2>
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
              <div className="flex justify-between text-verde-700 dark:text-verde-400"><span>Descuento</span><span>− {formatearMoneda(descuento)}</span></div>
            )}
          </div>
          <div className="my-4 border-t" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="tnum text-2xl font-extrabold">{formatearMoneda(total)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            El servidor confirma los montos finales al crear el pedido. El pago se registra en el siguiente paso.
          </p>
          <button
            type="button"
            className="btn-primary mt-4 hidden min-h-12 w-full lg:flex"
            onClick={enviar}
            disabled={crear.isPending}
          >
            {crear.isPending ? 'Creando pedido…' : 'Confirmar pedido'}
          </button>
          <Link to="/carrito" className="btn-ghost mt-2 w-full">
            Volver a la canasta
          </Link>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-slate-950 bg-white px-4 py-3 dark:border-slate-300 dark:bg-slate-950 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-300">Total</p>
            <p className="tnum text-2xl font-extrabold leading-none">{formatearMoneda(total)}</p>
          </div>
          <button type="button" className="btn-primary ml-auto min-h-12 flex-1 sm:flex-none" onClick={enviar} disabled={crear.isPending}>
            {crear.isPending ? 'Creando pedido…' : 'Confirmar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
