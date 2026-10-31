import { CheckCircle2, Clock, Package, XCircle } from 'lucide-react';
import type { Pedido } from '../../lib/types';
import { formatearFechaHora } from '../../lib/format';
import { estaPorVencer, textoCuentaRegresiva, useAhora, yaVencio } from '../../lib/plazo';

interface Props {
  datos: Pedido;
  esNuevo: boolean;
  esComprador: boolean;
  /** Hay un pago en efectivo sin cobrar (en un retiro se paga en el puesto). */
  efectivoPendiente?: boolean;
  /** Reloj en milisegundos; solo lo fijan las pruebas (por defecto, el reloj real). */
  ahora?: number;
}

/** Termina una frase con la fecha sin duplicar el punto de «p. m.». */
function finDeFrase(fecha: string): string {
  return fecha.endsWith('.') ? fecha : `${fecha}.`;
}

/** Cuántas veces puede el vendedor dar más tiempo (igual que el backend). */
const MAX_EXTENSIONES = 2;

/** Avisos de contexto sobre el pedido: recién creado, listo para recoger, en camino o con reporte de «no recibido». */
export function AvisosPedido({ datos, esNuevo, esComprador, efectivoPendiente = false, ahora }: Props) {
  const reloj = useAhora();
  const esRetiro = datos.tipo_entrega === 'retiro';
  const pagaAlRecoger = esRetiro && efectivoPendiente;
  return (
    <>
      {esNuevo && datos.estado === 'pendiente' && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {pagaAlRecoger
              ? 'Tu pedido fue creado. Pasa por el puesto cuando esté listo. Pagas ahí.'
              : 'Tu pedido fue creado. Registra el pago para que el vendedor pueda confirmarlo.'}
          </p>
        </div>
      )}

      {esRetiro && esComprador && pagaAlRecoger && ['confirmado', 'en_preparacion'].includes(datos.estado) && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
          <Package className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Pasa por el puesto cuando esté listo. Pagas ahí.</p>
        </div>
      )}

      {esRetiro && datos.estado === 'listo_para_recoger' && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
          <Package className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {esComprador
              ? pagaAlRecoger
                ? 'Tu pedido está listo. Pasa por el puesto a recogerlo y págalo ahí en efectivo.'
                : 'Tu pedido está listo. Pasa por el puesto a recogerlo.'
              : pagaAlRecoger
                ? 'Esperando al cliente en el puesto. Entrega el pedido y cobra en efectivo.'
                : 'Esperando al cliente en el puesto. Entrega el pedido cuando llegue.'}
          </p>
        </div>
      )}

      <AvisoPlazo datos={datos} esComprador={esComprador} ahora={ahora ?? reloj} />

      {datos.estado === 'cancelado' && datos.motivo_cancelacion && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {datos.motivo_cancelacion === 'no_recogido'
              ? `Se canceló solo: no se recogió antes del ${finDeFrase(formatearFechaHora(datos.fecha_actualizacion))}`
              : 'Se canceló solo: el puesto no lo confirmó a tiempo.'}{' '}
            {esComprador
              ? 'El producto volvió a la venta. Puedes hacer un pedido nuevo.'
              : 'El stock volvió a tu puesto.'}
          </p>
        </div>
      )}

      {!esRetiro && datos.estado === 'en_camino' && (
        <div className="mb-5 space-y-2">
          {datos.no_recibido_en && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {esComprador ? 'Ya avisaste que no te ha llegado' : 'El comprador reportó que no le ha llegado'}
                {' '}el {formatearFechaHora(datos.no_recibido_en)}.
                {datos.motivo_no_recibido && <> Motivo: {datos.motivo_no_recibido}.</>}
                {esComprador && ' Si el pedido llega, confírmalo con "Ya recibí mi pedido".'}
              </p>
            </div>
          )}
          {!datos.no_recibido_en && esComprador && (
            <div className="flex items-start gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
              <Package className="mt-0.5 h-4 w-4 shrink-0" />
              <p>El vendedor ya entregó tu pedido al domiciliario. Confírmalo cuando lo tengas.</p>
            </div>
          )}
          {!datos.no_recibido_en && !esComprador && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Esperando que el comprador confirme que recibió el pedido.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Plazo del retiro (apartar con plazo): hasta cuándo se confirma o se recoge y cuánto falta.
 * Solo aparece si el backend manda `vence_en` (retiros pendientes o listos para recoger sin pagar).
 */
function AvisoPlazo({ datos, esComprador, ahora }: { datos: Pedido; esComprador: boolean; ahora: number }) {
  if (!datos.vence_en || !['pendiente', 'listo_para_recoger'].includes(datos.estado)) return null;
  const fecha = formatearFechaHora(datos.vence_en);
  // «p. m.» ya trae su punto: al cerrar la frase no se duplica.
  const fechaFinal = finDeFrase(fecha);
  const vencido = yaVencio(datos.vence_en, ahora);
  const porVencer = estaPorVencer(datos.vence_en, ahora);
  const listo = datos.estado === 'listo_para_recoger';
  const usadas = datos.extensiones_plazo ?? 0;
  const colores = vencido || porVencer
    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
    : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
  const Icono = vencido || porVencer ? Clock : Package;
  return (
    <div className={`mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${colores}`} role="status">
      <Icono className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        {esComprador ? (
          listo ? (
            <>
              <p className="font-bold">Recógelo antes del {fechaFinal}</p>
              <p>Si no pasas, el pedido se cancela solo y el producto vuelve a la venta.</p>
            </>
          ) : (
            <p>Si el puesto no lo confirma antes del {fecha}, el pedido se cancela solo.</p>
          )
        ) : listo ? (
          <p>El cliente tiene hasta el {fecha} para recoger. Después se cancela solo y el stock vuelve.</p>
        ) : (
          <p>Confírmalo antes del {fecha} o se cancela solo.</p>
        )}
        <p className="font-semibold">
          {textoCuentaRegresiva(datos.vence_en, ahora)}
          {porVencer && '. Falta poco'}
          {vencido && !esComprador && '. Da más tiempo ahora si el cliente va en camino'}
          {'.'}
        </p>
        {!esComprador && usadas > 0 && (
          <p>
            Ya diste más tiempo {usadas} de {MAX_EXTENSIONES} veces.
          </p>
        )}
      </div>
    </div>
  );
}
