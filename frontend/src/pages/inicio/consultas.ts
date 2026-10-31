/**
 * Consultas de la tienda y del catálogo en un solo lugar.
 *
 * Las usan las pantallas (`Inicio`, `Catalogo`) y la precarga de `lib/precarga.ts`. Compartir las
 * definiciones garantiza que la precarga y la pantalla usen la MISMA clave y la misma función:
 * si se desalinearan, la precarga sería una petición de más en vez de un dato ya listo.
 */
import { listarCategorias, listarProductos, listarPuestos, type FiltrosProducto } from '../../api/catalog';
import { claves } from '../../lib/queryKeys';
import type { Categoria } from '../../lib/types';

export const TAMANO_CATALOGO = 15;

export const consultaCategorias = {
  queryKey: claves.categorias,
  queryFn: listarCategorias,
  staleTime: 5 * 60_000,
};

export const consultaProductosInicio = {
  queryKey: claves.productos.inicio,
  queryFn: () => listarProductos({ page_size: 10, ordering: '-id' }),
};

export const consultaPuestosInicio = {
  queryKey: claves.puestos.inicio,
  queryFn: () => listarPuestos({ page_size: 6, ordering: 'nombre' }),
};

/** Categoría del segundo estante: la primera de frutas si existe; si no, la primera de la lista. */
export function categoriaDestacada(categorias: Categoria[] | undefined): Categoria | undefined {
  const lista = categorias ?? [];
  return lista.find((c) => /^fruta/i.test(c.nombre)) ?? lista[0];
}

export function consultaProductosDeCategoria(categoriaId: number) {
  const filtros = { categoria: categoriaId, page_size: 10 };
  return {
    queryKey: claves.productos.catalogo(filtros),
    queryFn: () => listarProductos(filtros),
  };
}

/** Filtros del catálogo según la URL (sin query string: la primera página sin filtros). */
export function filtrosCatalogoDe(params: URLSearchParams): FiltrosProducto {
  return {
    page: Number(params.get('page') ?? 1) || 1,
    page_size: TAMANO_CATALOGO,
    q: params.get('q') || undefined,
    categoria: params.get('categoria') || undefined,
    ordering: params.get('ordering') || undefined,
    precio_min: params.get('precio_min') || undefined,
    precio_max: params.get('precio_max') || undefined,
  };
}

export function consultaCatalogo(filtros: FiltrosProducto) {
  return {
    queryKey: claves.productos.catalogo(filtros),
    queryFn: () => listarProductos(filtros),
  };
}
