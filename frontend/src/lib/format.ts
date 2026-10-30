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

export function numero(valor: string | number | null | undefined): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const ETIQUETAS_PEDIDO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

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

export function colorEstado(estado: string | null | undefined): string {
  switch (estado) {
    case 'entregado':
    case 'aprobado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'pendiente':
    case 'procesando':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    case 'confirmado':
    case 'en_preparacion':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
    case 'en_camino':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
    case 'cancelado':
    case 'rechazado':
    case 'anulado':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    case 'reembolsado':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}
