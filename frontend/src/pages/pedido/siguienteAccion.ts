import { CheckCircle2, Package, Truck } from 'lucide-react';
import type { AccionPedido } from '../../api/orders';
import type { Pedido } from '../../lib/types';

export type IconoSiguiente = 'confirmar' | 'preparar' | 'enviar' | 'entregar';

export interface SiguienteAccion {
  accion: AccionPedido;
  etiqueta: string;
  icono: IconoSiguiente;
}

export const ICONOS_SIGUIENTE: Record<IconoSiguiente, typeof CheckCircle2> = {
  confirmar: CheckCircle2,
  preparar: Package,
  enviar: Truck,
  entregar: CheckCircle2,
};

type Contexto = 'vendedor' | 'admin';

/**
 * Botón principal de avance de un pedido en las listas del vendedor y del admin.
 *
 * Qué paso toca depende del tipo de entrega (retiro: «listo para recoger»; domicilio:
 * «en camino»), pero SOLO se ofrece si el backend lo permite (`acciones_permitidas`).
 * En un retiro con efectivo sin cobrar el backend también ofrece `confirmar-pago`: la
 * entrega es entonces «Entregar y cobrar».
 */
export function siguienteAccion(
  pedido: Pick<Pedido, 'estado' | 'tipo_entrega' | 'acciones_permitidas'>,
  contexto: Contexto,
): SiguienteAccion | null {
  const permitidas = pedido.acciones_permitidas ?? [];
  const esRetiro = pedido.tipo_entrega === 'retiro';
  let candidata: SiguienteAccion | null = null;
  switch (pedido.estado) {
    case 'pendiente':
      candidata = {
        accion: 'confirmar',
        etiqueta: contexto === 'admin' ? 'Confirmar' : 'Confirmar pedido',
        icono: 'confirmar',
      };
      break;
    case 'confirmado':
      candidata = {
        accion: 'en-preparacion',
        etiqueta: contexto === 'admin' ? 'En preparación' : 'Pasar a preparación',
        icono: 'preparar',
      };
      break;
    case 'en_preparacion':
      candidata = esRetiro
        ? { accion: 'listo-para-recoger', etiqueta: 'Marcar listo para recoger', icono: 'enviar' }
        : {
            accion: 'enviar',
            etiqueta: contexto === 'admin' ? 'En camino' : 'Entregado al domiciliario',
            icono: 'enviar',
          };
      break;
    case 'listo_para_recoger':
    case 'en_camino':
      candidata = {
        accion: 'entregar',
        etiqueta:
          esRetiro && permitidas.includes('confirmar-pago') ? 'Entregar y cobrar' : 'Marcar entregado',
        icono: 'entregar',
      };
      break;
    default:
      return null;
  }
  return permitidas.includes(candidata.accion) ? candidata : null;
}
