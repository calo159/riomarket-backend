/** Enlace https://wa.me con mensaje prellenado, o ``null`` si no hay un número válido. */
export function enlaceWhatsapp(numero: string | null | undefined, mensaje: string): string | null {
  const digitos = (numero ?? '').trim();
  // La API entrega el número internacional (57 + 10 dígitos). Cualquier otra cosa no se enlaza.
  if (!/^\d{11,15}$/.test(digitos)) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

export const mensajeWhatsappProducto = (producto: string) =>
  `Hola, vi ${producto} en RioMarket y quisiera más información.`;

export const mensajeWhatsappPuesto = (puesto: string) =>
  `Hola, vi tu puesto ${puesto} en RioMarket y quisiera más información.`;
