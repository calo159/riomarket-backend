const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const fecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: 'America/Bogota',
});

const fechaHora = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Fecha de hoy (AAAA-MM-DD) en Bogotá: ``toISOString`` usa UTC y después de las 19:00 ya es "mañana". */
export function hoyBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export function formatearMoneda(valor: string | number | null | undefined): string {
  const numero = Number(valor ?? 0);
  return moneda.format(Number.isFinite(numero) ? numero : 0);
}

export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '—' : fecha.format(d);
}

export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '—' : fechaHora.format(d);
}

/** Calificación con un decimal; ``vacio`` es lo que se muestra si aún no hay reseñas. */
export function formatearCalificacion(valor: number | null | undefined, vacio = 'Sin reseñas'): string {
  return valor ? valor.toFixed(1) : vacio;
}

export function numero(valor: string | number | null | undefined): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const ETIQUETAS_PEDIDO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  listo_para_recoger: 'Listo para recoger',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

/** Opciones del filtro por estado de pedido (plural, como se lee en una lista filtrada). */
export const OPCIONES_FILTRO_PEDIDO: { valor: string; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'confirmado', etiqueta: 'Confirmados' },
  { valor: 'en_preparacion', etiqueta: 'En preparación' },
  { valor: 'en_camino', etiqueta: 'En camino' },
  { valor: 'listo_para_recoger', etiqueta: 'Listos para recoger' },
  { valor: 'entregado', etiqueta: 'Entregados' },
  { valor: 'cancelado', etiqueta: 'Cancelados' },
];

export const ETIQUETAS_PAGO: Record<string, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  reembolsado: 'Reembolsado',
  anulado: 'Anulado',
};

export const ETIQUETAS_VERIFICACION: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const ETIQUETAS_ROL: Record<string, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
  administrador: 'Administrador',
};

export function etiquetaEstado(estado: string | null | undefined): string {
  if (!estado) return '—';
  return ETIQUETAS_PEDIDO[estado] ?? ETIQUETAS_PAGO[estado] ?? ETIQUETAS_VERIFICACION[estado] ?? estado;
}

/**
 * Colores de estado: una familia de tonos apagados y parejos en luminosidad (como los de categoría), no los colores por
 * defecto de la librería. Verde = bien, ámbar = espera, turquesa = en marcha, rojo = problema, gris = sin significado.
 */
const TONO_BIEN = 'bg-[#DFF0E4] text-[#14532D] dark:bg-[#12331F] dark:text-[#9BDDB1]';
const TONO_ESPERA = 'bg-[#FBE8C6] text-[#6E4200] dark:bg-[#46330F] dark:text-[#F5D79B]';
const TONO_EN_MARCHA = 'bg-[#D9EFEC] text-[#0F5550] dark:bg-[#12383A] dark:text-[#BDE6E1]';
const TONO_LISTO = 'bg-[#DDEBD3] text-[#274A12] dark:bg-[#22351A] dark:text-[#CFE4B8]';
const TONO_PROBLEMA = 'bg-[#F6DDD6] text-[#7E2413] dark:bg-[#43211D] dark:text-[#F5BFB2]';
const TONO_DEVUELTO = 'bg-[#E9DFEF] text-[#4A2860] dark:bg-[#33263F] dark:text-[#DAC7E6]';
const TONO_NEUTRO = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export function colorEstado(estado: string | null | undefined): string {
  switch (estado) {
    case 'entregado':
    case 'aprobado':
    case 'activo':
    case 'activa':
      return TONO_BIEN;
    case 'pendiente':
    case 'procesando':
      return TONO_ESPERA;
    case 'confirmado':
    case 'en_preparacion':
    case 'en_camino':
      return TONO_EN_MARCHA;
    case 'listo_para_recoger':
      return TONO_LISTO;
    case 'cancelado':
    case 'rechazado':
    case 'anulado':
    case 'suspendido':
    case 'bloqueado':
      return TONO_PROBLEMA;
    case 'reembolsado':
      return TONO_DEVUELTO;
    default:
      return TONO_NEUTRO;
  }
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «18 oct» a partir de una fecha AAAA-MM-DD (la del servidor, ya en hora de Colombia). */
export function formatearDiaMes(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  if (!anio || !mes || !dia || mes > 12) return fechaIso;
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}
