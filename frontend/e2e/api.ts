import { request, type APIRequestContext } from '@playwright/test';

/** Contraseña de todas las cuentas del seed (`seed_masivo`); es pública a propósito. */
export const CLAVE_DEMO = 'RioMarket2026!';

export type Pedido = {
  id: number;
  estado: string;
  total: string;
  tipo_entrega: string;
  acciones_permitidas: string[];
};

type ItemNuevo = { id_producto: number; cantidad: number; detalles?: string };

type DatosPedido = {
  id_puesto: number;
  items: ItemNuevo[];
  /** ISO 8601; solo para productos por encargo. */
  fecha_solicitada?: string;
  notas?: string;
};

/**
 * Cliente de la API con su propia sesión (un contexto aparte del navegador de la prueba).
 * Sirve para preparar y limpiar datos sin pasar por pantallas que la prueba no verifica.
 */
export class SesionApi {
  private constructor(
    private readonly contexto: APIRequestContext,
    private readonly token: string,
  ) {}

  static async iniciar(baseURL: string, correo: string): Promise<SesionApi> {
    const contexto = await request.newContext({ baseURL });
    const respuesta = await contexto.post('/api/auth/login/', { data: { correo, password: CLAVE_DEMO } });
    if (!respuesta.ok()) {
      await contexto.dispose();
      throw new Error(`No se pudo iniciar sesión con ${correo}: ${respuesta.status()}`);
    }
    const { access } = (await respuesta.json()) as { access: string };
    return new SesionApi(contexto, access);
  }

  private get cabeceras() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async obtener<T>(ruta: string): Promise<T> {
    const respuesta = await this.contexto.get(ruta, { headers: this.cabeceras });
    if (!respuesta.ok()) throw new Error(`GET ${ruta} respondió ${respuesta.status()}`);
    return (await respuesta.json()) as T;
  }

  async enviar(ruta: string, datos: unknown = {}) {
    return this.contexto.post(ruta, { headers: this.cabeceras, data: datos });
  }

  /** Id de un producto del seed, por su nombre exacto. */
  async idProducto(nombre: string): Promise<{ id: number; puesto: number }> {
    const { results } = await this.obtener<{ results: { id: number; id_puesto: number; nombre: string }[] }>(
      `/api/catalog/productos/?q=${encodeURIComponent(nombre)}`,
    );
    const producto = results.find((item) => item.nombre === nombre);
    if (!producto) throw new Error(`El seed no tiene el producto «${nombre}».`);
    return { id: producto.id, puesto: producto.id_puesto };
  }

  /** Crea un pedido en retiro con pago al recoger (lo mismo que hace el checkout). */
  async crearPedidoRetiro(datos: DatosPedido): Promise<Pedido> {
    const respuesta = await this.enviar('/api/orders/pedidos/', { ...datos, tipo_entrega: 'retiro' });
    if (respuesta.status() !== 201) {
      throw new Error(`No se pudo crear el pedido: ${respuesta.status()} ${await respuesta.text()}`);
    }
    const pedido = (await respuesta.json()) as Pedido;
    const pago = await this.enviar('/api/payments/pagos/', { pedido: pedido.id, metodo_pago: 'efectivo' });
    if (!pago.ok()) throw new Error(`No se pudo registrar el pago al recoger: ${pago.status()}`);
    return pedido;
  }

  /** Cancela un pedido para devolver el stock; si ya no se puede cancelar, no hace nada. */
  async cancelarPedido(id: number): Promise<void> {
    await this.enviar(`/api/orders/pedidos/${id}/cancelar/`);
  }

  /** Devuelve al inventario unidades que una entrega ya consumió (la vendedora sube el stock). */
  async reponerStock(idProducto: number, unidades: number): Promise<void> {
    const producto = await this.obtener<{ stock: number }>(`/api/catalog/productos/${idProducto}/`);
    const respuesta = await this.contexto.patch(`/api/catalog/productos/${idProducto}/`, {
      headers: this.cabeceras,
      data: { stock: producto.stock + unidades },
    });
    if (!respuesta.ok()) throw new Error(`No se pudo reponer el stock: ${respuesta.status()}`);
  }

  async cerrar(): Promise<void> {
    await this.contexto.dispose();
  }
}
