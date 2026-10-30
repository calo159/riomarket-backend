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
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

/** Opciones del filtro por estado de pedido (plural, como se lee en una lista filtrada). */
export const OPCIONES_FILTRO_PEDIDO: { valor: string; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'confirmado', etiqueta: 'Confirmados' },
  { valor: 'en_preparacion', etiqueta: 'En preparación' },
  { valor: 'en_camino', etiqueta: 'En camino' },
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

/** Chips de estado macizos: verde = bien, amarillo = espera, azul = en curso, rojo = problema. */
export function colorEstado(estado: string | null | undefined): string {
  switch (estado) {
    case 'entregado':
    case 'aprobado':
      return 'bg-verde-600 text-white';
    case 'pendiente':
    case 'procesando':
      return 'bg-sol-400 text-slate-950';
    case 'confirmado':
    case 'en_preparacion':
    case 'en_camino':
      return 'bg-brand-600 text-white dark:bg-brand-500';
    case 'cancelado':
    case 'rechazado':
    case 'anulado':
      return 'bg-rojo-600 text-white';
    case 'reembolsado':
      return 'bg-slate-600 text-white';
    default:
      return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100';
  }
}
