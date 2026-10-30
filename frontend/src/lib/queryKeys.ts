/**
 * Claves de TanStack Query en un solo lugar.
 *
 * - Cada familia expone ``todos`` (el prefijo, para ``invalidateQueries``) y los constructores de
 *   sus consultas, que siempre empiezan por ese prefijo: invalidar la familia alcanza a todas.
 * - Los ids se normalizan a número: ``useParams`` entrega strings y las respuestas del API números,
 *   y ``['puesto', '3']`` no coincide con ``['puesto', 3]`` (dos entradas de caché para el mismo dato).
 */

type Id = number | string | null | undefined;
/** Valor de un filtro de listado (tal como lo guarda el estado de la pantalla). */
type Filtro = string | number | boolean | null;

/** Normaliza un id a número (o ``null`` si no hay) para que las claves coincidan. */
export function idClave(id: Id): number | null {
  if (id === null || id === undefined || id === '') return null;
  const numero = Number(id);
  return Number.isNaN(numero) ? null : numero;
}

export const claves = {
  menu: ['menu'] as const,
  categorias: ['categorias'] as const,
  auditoria: ['auditoria'] as const,
  adminResumen: ['admin-resumen'] as const,
  adminRoles: ['admin-roles'] as const,
  perfil: ['perfil'] as const,
  direcciones: ['direcciones'] as const,
  miVerificacion: ['mi-verificacion'] as const,

  adminRecursos: {
    todos: ['admin-recursos'] as const,
    lista: (busqueda: Filtro, ambito: Filtro, activo: Filtro) =>
      ['admin-recursos', busqueda, ambito, activo] as const,
  },

  solicitudes: {
    todos: ['solicitudes'] as const,
    lista: (filtro: Filtro) => ['solicitudes', filtro] as const,
  },

  usuarios: {
    todos: ['usuarios'] as const,
    lista: (pagina: Filtro, busqueda: Filtro, rol: Filtro, estado: Filtro, rolAsignado: Filtro) =>
      ['usuarios', pagina, busqueda, rol, estado, rolAsignado] as const,
  },

  notificaciones: {
    todos: ['notificaciones'] as const,
    lista: (pagina: Filtro, soloNoLeidas: boolean) => ['notificaciones', pagina, soloNoLeidas] as const,
  },

  cupones: {
    todos: ['cupones'] as const,
    admin: ['cupones', 'admin'] as const,
    vendedor: ['cupones', 'vendedor'] as const,
  },

  pedido: (id: Id) => ['pedido', idClave(id)] as const,
  pedidos: {
    todos: ['pedidos'] as const,
    admin: (pagina: Filtro, estado: Filtro, soloNoRecibidos: Filtro) =>
      ['pedidos', 'admin', pagina, estado, soloNoRecibidos] as const,
    comprador: (pagina: Filtro, estado: Filtro) => ['pedidos', 'comprador', pagina, estado] as const,
    vendedor: (usuarioId: Id, pagina: Filtro, estado: Filtro) =>
      ['pedidos', 'vendedor', idClave(usuarioId), pagina, estado] as const,
    vendedorPendientes: ['pedidos', 'vendedor', 'pendientes'] as const,
  },

  pagos: {
    todos: ['pagos'] as const,
    admin: (estado: Filtro, porConfirmar: Filtro) => ['pagos', 'admin', 'list', estado, porConfirmar] as const,
    deUnPedido: (pedidoId: Id) => ['pagos', 'pedido', idClave(pedidoId)] as const,
    resumenIngresos: ['pagos', 'resumen'] as const,
  },

  producto: (id: Id) => ['producto', idClave(id)] as const,
  productos: {
    todos: ['productos'] as const,
    admin: (pagina: Filtro, busqueda: Filtro, estado: Filtro) =>
      ['productos', 'admin', pagina, busqueda, estado] as const,
    catalogo: (filtros: unknown) => ['productos', 'catalogo', filtros] as const,
    inicio: ['productos', 'inicio'] as const,
    deUnPuesto: (puestoId: Id, categoria: Filtro, pagina: Filtro) =>
      ['productos', 'puesto', idClave(puestoId), categoria, pagina] as const,
    vendedor: ['productos', 'vendedor'] as const,
    vendedorTotal: ['productos', 'vendedor', 'total'] as const,
  },

  puesto: (id: Id) => ['puesto', idClave(id)] as const,
  puestos: {
    todos: ['puestos'] as const,
    admin: (pagina: Filtro, busqueda: Filtro, estado: Filtro) =>
      ['puestos', 'admin', pagina, busqueda, estado] as const,
    inicio: ['puestos', 'inicio'] as const,
    landing: ['puestos', 'landing'] as const,
    mapa: ['puestos', 'mapa'] as const,
    todosParaSeleccion: ['puestos', 'todos'] as const,
    vendedor: (usuarioId: Id) => ['puestos', 'vendedor', idClave(usuarioId)] as const,
  },

  resenas: {
    todos: ['resenas'] as const,
    admin: (pagina: Filtro, calificacion: Filtro) => ['resenas', 'admin', pagina, calificacion] as const,
    deUnPuesto: (puestoId: Id) => ['resenas', 'puesto', idClave(puestoId)] as const,
    vendedor: (usuarioId: Id) => ['resenas', 'vendedor', idClave(usuarioId)] as const,
  },
};
