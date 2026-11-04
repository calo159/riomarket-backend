/** Cómo se llama cada acción de la auditoría (los códigos vienen del servidor). */
export const ETIQUETAS_ACCION: Record<string, string> = {
  crear: 'Crear',
  actualizar: 'Actualizar',
  eliminar: 'Eliminar',
  transicion: 'Cambio de estado',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  reembolsar: 'Reembolsar',
  anular: 'Anular',
  usar_cupon: 'Usar cupón',
  responder: 'Responder',
  vencimiento: 'Cancelado por plazo',
  extender_plazo: 'Más tiempo para recoger',
};

const LIMITE = 220;

function texto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
}

function recortar(valor: string): string {
  return valor.length > LIMITE ? `${valor.slice(0, LIMITE - 1)}…` : valor;
}

/**
 * Una frase corta con lo que cambió, a partir del `detalle` que guarda el servidor:
 * «rol: comprador → vendedor · Motivo: …», «pendiente → confirmado», o los datos sueltos.
 */
export function resumenDetalle(detalle: unknown): string {
  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) return '';
  const datos = detalle as Record<string, unknown>;
  const { motivo, ...resto } = datos;
  const motivoTexto = motivo ? ` · Motivo: ${texto(motivo)}` : '';

  let principal: string;
  if ('campo' in resto && ('de' in resto || 'a' in resto)) {
    principal = `${texto(resto.campo)}: ${texto(resto.de)} → ${texto(resto.a)}`;
  } else if ('de' in resto && 'a' in resto) {
    principal = `${texto(resto.de)} → ${texto(resto.a)}`;
  } else {
    principal = Object.entries(resto)
      .map(([clave, valor]) => `${clave}: ${texto(valor)}`)
      .join(' · ');
  }
  const completo = `${principal}${motivoTexto}`.replace(/^ · /, '');
  return recortar(completo);
}
