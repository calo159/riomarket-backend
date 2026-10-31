import type { components } from './api-types';

type Schemas = components['schemas'];

export type Rol = 'comprador' | 'vendedor' | 'administrador';
export type Categoria = Schemas['Categoria'];
export type Producto = Schemas['Producto'];
export type ImagenProducto = Schemas['ImagenProducto'];
export type Puesto = Schemas['Puesto'];
export type Pedido = Schemas['Pedido'];
export type ItemPedido = Schemas['ItemPedido'];
export type Pago = Schemas['Pago'];
export type Direccion = Schemas['Direccion'];
export type Notificacion = Schemas['Notificacion'];
export type Resena = Schemas['Resena'];
export type Cupon = Schemas['Cupon'];
export type RegistroAuditoria = Schemas['RegistroAuditoria'];
export type MiVerificacion = Schemas['MiVerificacion'];
export type VerificacionAdminList = Schemas['VerificacionAdminList'];
export type Perfil = Schemas['Perfil'];

export interface Paginado<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  celular: string;
  rol: Rol;
  estado: 'activo' | 'suspendido';
  estado_verificacion?: string | null;
  fecha_registro?: string;
}

export interface RespuestaLogin {
  access: string;
  refresh?: string;
  usuario: UsuarioSesion;
}

export interface ErrorApi {
  success?: false;
  status_code?: number;
  errors?: Record<string, string[] | string> | string;
  detail?: string;
}

export interface RespuestaValidarCupon {
  codigo: string;
  tipo_descuento: 'porcentaje' | 'monto';
  valor: string;
  descuento: string;
}

export interface ItemCarrito {
  productoId: number;
  nombre: string;
  precio: string;
  unidadMedida: string;
  cantidad: number;
  /** Unidades que se pueden pedir: el stock, o 20 en un encargo. */
  stock: number;
  imagen?: string | null;
  // Productos por encargo (ADR-013). Ausentes en carritos guardados antes: se leen como «stock».
  modalidad?: 'stock' | 'encargo';
  preparacionHoras?: number | null;
  pideDetalles?: boolean;
  etiquetaDetalles?: string;
  /** Lo que escribió el comprador (sabor, mensaje...). */
  detalles?: string;
}

export interface Carrito {
  puestoId: number;
  puestoNombre: string;
  ofreceDomicilio: boolean;
  items: ItemCarrito[];
}

export interface PagoVendedor extends Pago {
  comision_plataforma?: string;
  neto_vendedor?: string;
  datos_sandbox?: Record<string, unknown>;
}
