import { useQuery } from '@tanstack/react-query';
import { contarNoLeidas } from '../api/notifications';
import { listarPedidos } from '../api/orders';
import { listarSolicitudes } from '../api/verification';
import { useSession } from '../auth/SessionProvider';
import { useCart } from '../cart/CartProvider';
import type { BadgeMenu } from './menu';

export type BadgesMenu = Partial<Record<BadgeMenu, number>>;

const INTERVALO = 60_000;

/**
 * Contadores del menú. Reutiliza las queryKey que ya usan NotificationBell,
 * PanelVendedor y PanelAdmin para compartir caché; si una consulta falla o
 * sigue cargando, su badge simplemente no se muestra.
 */
export function useMenuBadges(): BadgesMenu {
  const { autenticado, rol } = useSession();
  const { totalItems } = useCart();

  const notificaciones = useQuery({
    queryKey: ['notificaciones', 'contador'],
    queryFn: contarNoLeidas,
    enabled: autenticado,
    refetchInterval: INTERVALO,
  });

  const pedidosComprador = useQuery({
    queryKey: ['pedidos', 'comprador', 'en_camino'],
    queryFn: () => listarPedidos({ estado: 'en_camino', page_size: 100 }),
    enabled: autenticado && rol === 'comprador',
    refetchInterval: INTERVALO,
  });

  const pedidosVendedor = useQuery({
    queryKey: ['pedidos', 'vendedor', 'pendientes'],
    queryFn: () =>
      listarPedidos({ estado: 'pendiente', page_size: 5, ordering: '-fecha_creacion' }),
    enabled: autenticado && rol === 'vendedor',
    refetchInterval: INTERVALO,
  });

  const verificaciones = useQuery({
    queryKey: ['verif', 'pendiente'],
    queryFn: () => listarSolicitudes('pendiente'),
    enabled: autenticado && rol === 'administrador',
    refetchInterval: INTERVALO,
  });

  const pedidosReportados = useQuery({
    queryKey: ['pedidos', 'admin', 'no_recibido'],
    queryFn: () =>
      listarPedidos({ estado: 'en_camino', page_size: 100, ordering: '-fecha_creacion' }),
    enabled: autenticado && rol === 'administrador',
    refetchInterval: INTERVALO,
  });

  const badges: BadgesMenu = {};
  if (totalItems > 0) badges.carrito = totalItems;
  if (notificaciones.data) badges.notificaciones = notificaciones.data;
  if (pedidosComprador.data) badges['comprador-pedidos'] = pedidosComprador.data.count;
  if (pedidosVendedor.data) badges['vendedor-pedidos'] = pedidosVendedor.data.count;
  if (verificaciones.data) badges['admin-verificaciones'] = verificaciones.data.count;
  if (pedidosReportados.data) {
    badges['admin-pedidos'] = pedidosReportados.data.results.filter(
      (pedido) => pedido.estado === 'en_camino' && pedido.no_recibido_en,
    ).length;
  }
  return badges;
}
