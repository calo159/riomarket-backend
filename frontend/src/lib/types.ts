import type { components } from './api-types';

export type Schemas = components['schemas'];

export type Rol = 'comprador' | 'vendedor' | 'administrador';
export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';
export type EstadoPago =
  | 'pendiente'
  | 'procesando'
  | 'aprobado'
  | 'rechazado'
  | 'reembolsado'
  | 'anulado';
export type EstadoVerificacion = 'pendiente' | 'aprobado' | 'rechazado';

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
  stock: number;
  imagen?: string | null;
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
