import { api } from '../lib/http';
import type { Categoria, ImagenProducto, Paginado, Producto, Puesto } from '../lib/types';

export interface FiltrosProducto {
  q?: string;
  categoria?: number | string;
  puesto?: number | string;
  ordering?: string;
  page?: number;
  page_size?: number;
  precio_min?: number | string;
  precio_max?: number | string;
  estado?: string;
}

export interface FiltrosPuesto {
  q?: string;
  categoria?: number | string;
  vendedor?: number | string;
  domicilio?: boolean | string;
  estado?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Paginado<Categoria>>('/catalog/categorias/', { params: { page_size: 100 } });
  return data.results;
}

export async function listarProductos(filtros: FiltrosProducto = {}): Promise<Paginado<Producto>> {
  const { data } = await api.get<Paginado<Producto>>('/catalog/productos/', { params: filtros });
  return data;
}

export async function obtenerProducto(id: number | string): Promise<Producto> {
  const { data } = await api.get<Producto>(`/catalog/productos/${id}/`);
  return data;
}

export async function listarPuestos(filtros: FiltrosPuesto = {}): Promise<Paginado<Puesto>> {
  const { data } = await api.get<Paginado<Puesto>>('/catalog/puestos/', { params: filtros });
  return data;
}

export async function obtenerPuesto(id: number | string): Promise<Puesto> {
  const { data } = await api.get<Puesto>(`/catalog/puestos/${id}/`);
  return data;
}

export interface DatosPuesto {
  nombre: string;
  descripcion?: string;
  direccion: string;
  latitud?: string | null;
  longitud?: string | null;
  horario?: string;
  ofrece_domicilio?: boolean;
}

export async function crearPuesto(datos: DatosPuesto): Promise<Puesto> {
  const { data } = await api.post<Puesto>('/catalog/puestos/', datos);
  return data;
}

export async function actualizarPuesto(id: number, datos: Partial<DatosPuesto>): Promise<Puesto> {
  const { data } = await api.patch<Puesto>(`/catalog/puestos/${id}/`, datos);
  return data;
}

export async function eliminarPuesto(id: number): Promise<void> {
  await api.delete(`/catalog/puestos/${id}/`);
}

export async function asignarCategoriaPuesto(puestoId: number, categoriaId: number): Promise<Puesto> {
  const { data } = await api.post<Puesto>(`/catalog/puestos/${puestoId}/categorias/`, { categoria: categoriaId });
  return data;
}

export async function quitarCategoriaPuesto(puestoId: number, categoriaId: number): Promise<Puesto> {
  const { data } = await api.delete<Puesto>(`/catalog/puestos/${puestoId}/categorias/${categoriaId}/`);
  return data;
}

export interface DatosProducto {
  id_puesto: number;
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  precio: string;
  stock: number;
  unidad_medida: string;
  estado?: string;
}

export async function crearProducto(datos: DatosProducto): Promise<Producto> {
  const { data } = await api.post<Producto>('/catalog/productos/', datos);
  return data;
}

export async function actualizarProducto(id: number, datos: Partial<DatosProducto>): Promise<Producto> {
  const { data } = await api.patch<Producto>(`/catalog/productos/${id}/`, datos);
  return data;
}

export async function eliminarProducto(id: number): Promise<void> {
  await api.delete(`/catalog/productos/${id}/`);
}

export async function subirImagenProducto(id: number, archivo: File): Promise<ImagenProducto> {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  const { data } = await api.post<ImagenProducto>(`/catalog/productos/${id}/imagenes/`, formulario);
  return data;
}

export async function eliminarImagenProducto(id: number): Promise<void> {
  await api.delete(`/catalog/imagenes/${id}/`);
}
