import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api } from '../lib/http';
import { useSession } from '../auth/SessionProvider';
import { MENU_FALLBACK, type MenuRespuesta } from './tipos';

const CLAVE_MENU = ['menu'] as const;

export function useMenu() {
  const { autenticado, usuario } = useSession();
  const consulta = useQuery({
    queryKey: [...CLAVE_MENU, autenticado, usuario?.id ?? null, usuario?.rol ?? null],
    queryFn: async () => {
      const { data } = await api.get<MenuRespuesta>('/auth/menu/');
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  const menu = consulta.data ?? MENU_FALLBACK;
  return {
    menu,
    badges: menu.badges ?? {},
    cargando: consulta.isLoading,
    error: consulta.isError,
    recargar: consulta.refetch,
  };
}

/** Recursos efectivos del usuario; el backend sigue siendo quien decide. */
export function useAcceso() {
  const { menu, cargando } = useMenu();
  const recursos = new Set(menu.recursos);
  return {
    recursos,
    cargando,
    tiene: (codigo: string) => recursos.has(codigo),
  };
}

export function invalidarMenu(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: CLAVE_MENU });
}
