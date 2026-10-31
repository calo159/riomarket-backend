import type { QueryClient } from '@tanstack/react-query';
import {
  categoriaDestacada,
  consultaCatalogo,
  consultaCategorias,
  consultaProductosDeCategoria,
  consultaProductosInicio,
  consultaPuestosInicio,
  filtrosCatalogoDe,
} from '../pages/inicio/consultas';

/**
 * Pide los datos de la pantalla pública en cuanto arranca la aplicación, EN PARALELO con la
 * descarga del código de esa pantalla (que se carga bajo demanda). Sin esto la cascada era
 * HTML → JS → chunk de la pantalla → datos → fotos.
 *
 * Solo rutas públicas: nunca se precarga nada que dependa de la sesión. Los errores se ignoran:
 * si una precarga falla, la pantalla pide el dato de nuevo y muestra su propio estado de error.
 */
export function precargarRuta(queryClient: QueryClient, pathname: string, search = ''): void {
  const ruta = pathname.replace(/\/+$/, '') || '/';

  if (ruta === '/tienda') {
    void queryClient.prefetchQuery(consultaProductosInicio);
    void queryClient.prefetchQuery(consultaPuestosInicio);
    // El segundo estante depende de las categorías: se pide en cuanto estas llegan.
    void queryClient
      .fetchQuery(consultaCategorias)
      .then((categorias) => {
        const destacada = categoriaDestacada(categorias);
        if (destacada) return queryClient.prefetchQuery(consultaProductosDeCategoria(destacada.id));
      })
      .catch(() => undefined);
    return;
  }

  // Con filtros en la URL (búsqueda, página…) la clave depende de ellos: solo se precarga el caso
  // sin query string, que es el que `Catalogo` pide con los filtros vacíos.
  if (ruta === '/catalogo' && !search) {
    void queryClient.prefetchQuery(consultaCategorias);
    void queryClient.prefetchQuery(consultaCatalogo(filtrosCatalogoDe(new URLSearchParams())));
  }
}
