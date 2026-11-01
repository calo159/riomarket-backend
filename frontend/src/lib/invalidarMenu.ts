import type { QueryClient } from '@tanstack/react-query';
import { claves } from './queryKeys';

/**
 * Hace que el menú (recursos y contadores de las insignias) se vuelva a pedir.
 * Vive en `lib` para que la sesión pueda usarla sin depender de `navigation`, que a su vez lee la sesión.
 */
export function invalidarMenu(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: claves.menu });
}
