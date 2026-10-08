"""Reglas de negocio de los pedidos.

4. Un pedido agrupa ítems de UN SOLO puesto, con productos activos y stock
   suficiente. Al crearlo el stock se descuenta de forma atómica (bloqueo de
   filas) y los precios se congelan en los ítems; al cancelar se repone.
5. El estado solo avanza por transiciones válidas y quien puede ejecutarlas
   depende del rol: el vendedor dueño confirma y avanza la preparación, el
   comprador puede cancelar mientras el pedido no salga del puesto, y el
   administrador puede todo.

Las autorizaciones viven aquí (``PermissionDenied`` → 403 en la API) para
que sean verificables aisladas desde tests, igual que las del catálogo.
"""

from decimal import Decimal

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Q, QuerySet

from apps.accounts.models import Usuario
from apps.catalog.models import Producto, Puesto
from apps.common.query import (  # noqa: F401  (reexportado: services.aplicar_ordenamiento)
    aplicar_ordenamiento,
    parametro_entero,
    validar_estado_parametro,
)
from apps.orders.models import ItemPedido, Pedido

# Campos de consulta admitidos en el ordenamiento (whitelist anti-inyección).
ORDENAMIENTO_PEDIDO = ("fecha_creacion", "-fecha_creacion", "total", "-total", "id", "-id")

TARIFA_DOMICILIO = Decimal("0.00")  # se define en la fase de pagos (settings)

# Máquina de estados de la regla 5: destino -> transiciones permitidas desde él.
TRANSICIONES: dict[str, tuple[str, ...]] = {
    Pedido.Estado.PENDIENTE: (Pedido.Estado.CONFIRMADO, Pedido.Estado.CANCELADO),
    Pedido.Estado.CONFIRMADO: (Pedido.Estado.EN_PREPARACION, Pedido.Estado.CANCELADO),
    Pedido.Estado.EN_PREPARACION: (Pedido.Estado.EN_CAMINO, Pedido.Estado.CANCELADO),
    Pedido.Estado.EN_CAMINO: (Pedido.Estado.ENTREGADO,),
    Pedido.Estado.ENTREGADO: (),
    Pedido.Estado.CANCELADO: (),
}

# Roles por transición (el administrador siempre puede).
_VENDEDOR = "vendedor"
_PARTE = "comprador_o_vendedor"


# ---------------------------------------------------------------------------
# Regla 4: creación
# ---------------------------------------------------------------------------
def crear_pedido(*, usuario, datos: dict) -> Pedido:
    """Crea un pedido descontando stock atómicamente y congelando precios.

    ``datos``: ``id_puesto`` (instancia), ``tipo_entrega``,
    ``direccion_entrega``, ``referencia_entrega``, ``notas`` e ``items``
    (lista de ``{"id_producto": Producto, "cantidad": int}``).
    """
    _autorizar_creacion(usuario)
    lineas = _normalizar_items(datos.get("items"))
    puesto = datos.get("id_puesto")
    if puesto is None:
        raise ValidationError({"id_puesto": "Debe indicar el puesto del pedido."})

    tipo_entrega = datos.get("tipo_entrega") or Pedido.TipoEntrega.RETIRO
    direccion = (datos.get("direccion_entrega") or "").strip()
    if puesto.estado != Puesto.Estado.ACTIVO:
        raise ValidationError({"id_puesto": "Ese puesto no está activo."})
    if tipo_entrega not in Pedido.TipoEntrega.values:
        raise ValidationError({"tipo_entrega": f"Tipo de entrega inválido: {tipo_entrega}."})
    if tipo_entrega == Pedido.TipoEntrega.DOMICILIO:
        if not puesto.ofrece_domicilio:
            raise ValidationError({"tipo_entrega": "Ese puesto no ofrece servicio a domicilio."})
        if not direccion:
            raise ValidationError(
                {"direccion_entrega": "Un pedido a domicilio debe indicar la dirección."}
            )

    with transaction.atomic():
        productos = _bloquear_productos(lineas)
        subtotal = Decimal("0.00")
        pedido = Pedido(
            id_comprador=usuario,
            id_puesto=puesto,
            tipo_entrega=tipo_entrega,
            direccion_entrega=direccion,
            referencia_entrega=datos.get("referencia_entrega") or "",
            notas=datos.get("notas") or "",
            tarifa_domicilio=TARIFA_DOMICILIO,
        )
        items_a_crear = []
        for producto, cantidad in _iterar_lineas(lineas, productos, puesto):
            if cantidad > producto.stock:
                raise ValidationError(
                    {
                        "items": (
                            f"Stock insuficiente para '{producto.nombre}': "
                            f"quedan {producto.stock} unidades."
                        )
                    }
                )
            producto.stock -= cantidad
            producto.save(update_fields=["stock"])
            subtotal += producto.precio * cantidad
            items_a_crear.append((producto, cantidad))

        pedido.subtotal = subtotal
        pedido.total = subtotal + pedido.tarifa_domicilio
        pedido.full_clean()
        pedido.save()
        for producto, cantidad in items_a_crear:
            ItemPedido.objects.create(
                id_pedido=pedido,
                id_producto=producto,
                nombre_producto=producto.nombre,
                unidad_medida=producto.unidad_medida,
                precio_unitario=producto.precio,
                cantidad=cantidad,
            )
    return pedido


def actualizar_pedido(*, pedido: Pedido, usuario, datos: dict) -> Pedido:
    """El comprador edita dirección/referencia/notas mientras sea pendiente."""
    _autorizar(pedido, usuario, quien=_PARTE)
    if not usuario.es_administrador and pedido.id_comprador_id != usuario.pk:
        raise PermissionDenied("Solo el comprador puede editar su pedido.")
    if pedido.estado != Pedido.Estado.PENDIENTE:
        raise ValidationError({"estado": "Solo se puede editar un pedido pendiente."})
    permitidos = ("direccion_entrega", "referencia_entrega", "notas")
    for campo in permitidos:
        if campo in datos:
            setattr(pedido, campo, datos[campo])
    if pedido.tipo_entrega == Pedido.TipoEntrega.DOMICILIO and not pedido.direccion_entrega.strip():
        raise ValidationError(
            {"direccion_entrega": "Un pedido a domicilio debe indicar la dirección."}
        )
    pedido.full_clean()
    pedido.save()
    return pedido


def _autorizar_creacion(usuario) -> None:
    if not (usuario and usuario.is_active and usuario.rol == Usuario.Rol.COMPRADOR):
        raise ValidationError(
            {
                "no_autorizado": (
                    "Solo los compradores activos pueden crear pedidos (regla de negocio 4)."
                )
            }
        )


def _normalizar_items(items) -> list[tuple]:
    """Consolida cantidades repetidas y valida la forma de cada línea."""
    if not items:
        raise ValidationError({"items": "El pedido debe incluir al menos un producto."})
    acumulados: dict[int, int] = {}
    orden: list[int] = []
    for linea in items:
        producto = linea.get("id_producto")
        clave = producto.pk if hasattr(producto, "pk") else producto
        if clave is None:
            raise ValidationError({"items": "Cada línea debe indicar un producto."})
        try:
            cantidad = int(linea.get("cantidad"))
        except (TypeError, ValueError) as exc:
            raise ValidationError({"items": "La cantidad debe ser un número entero."}) from exc
        if cantidad < 1:
            raise ValidationError({"items": "La cantidad debe ser al menos 1."})
        if clave not in acumulados:
            orden.append(clave)
            acumulados[clave] = 0
        acumulados[clave] += cantidad
    return [(clave, acumulados[clave]) for clave in orden]


def _bloquear_productos(lineas) -> dict[int, Producto]:
    """Bloquea las filas de producto en orden de PK (evita interbloqueos)."""
    claves = sorted(clave for clave, _ in lineas)
    filas = list(Producto.objects.select_for_update().filter(pk__in=claves).order_by("pk"))
    if len(filas) != len(claves):
        raise ValidationError({"items": "Hay productos que ya no existen."})
    return {fila.pk: fila for fila in filas}


def _iterar_lineas(lineas, productos: dict[int, Producto], puesto: Puesto):
    for clave, cantidad in lineas:
        producto = productos[clave]
        if producto.estado != Producto.Estado.ACTIVO:
            raise ValidationError({"items": f"'{producto.nombre}' no está disponible."})
        if producto.id_puesto_id != puesto.pk:
            raise ValidationError({"items": f"'{producto.nombre}' no pertenece a ese puesto."})
        yield producto, cantidad


def _reponer_stock(pedido: Pedido) -> None:
    """Regla 4: cancelar repone el stock exactamente una vez (por transición)."""
    for item in pedido.items.all():
        producto = item.id_producto
        producto.stock += item.cantidad
        producto.save(update_fields=["stock"])


# ---------------------------------------------------------------------------
# Regla 5: máquina de estados
# ---------------------------------------------------------------------------
def confirmar_pedido(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.CONFIRMADO)


def iniciar_preparacion(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.EN_PREPARACION)


def marcar_enviado(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.EN_CAMINO)


def marcar_entregado(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.ENTREGADO)


def cancelar_pedido(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.CANCELADO)


def _transicionar(*, pedido: Pedido, usuario, destino: str) -> Pedido:
    permitidas = TRANSICIONES[pedido.estado]
    if destino not in permitidas:
        raise ValidationError(
            {
                "estado": (
                    f"Transición inválida: '{pedido.estado}' → '{destino}'. "
                    f"Permitidas desde aquí: {', '.join(permitidas) or 'ninguna'}."
                )
            }
        )
    _autorizar(pedido, usuario, quien=_rol_para(destino))
    # Stock + estado en una sola transacción: o pasa todo o no pasa nada.
    with transaction.atomic():
        if destino == Pedido.Estado.CANCELADO:
            _reponer_stock(pedido)
        pedido.estado = destino
        pedido.save(update_fields=["estado", "fecha_actualizacion"])
    return pedido


def _rol_para(destino: str) -> str:
    if destino in (Pedido.Estado.CANCELADO, Pedido.Estado.ENTREGADO):
        return _PARTE
    return _VENDEDOR


def _autorizar(pedido: Pedido, usuario, *, quien: str) -> None:
    if not (usuario and usuario.is_active):
        raise PermissionDenied("Se requiere una cuenta activa.")
    if usuario.es_administrador:
        return
    es_comprador = pedido.id_comprador_id == usuario.pk
    es_vendedor = pedido.id_puesto.id_vendedor_id == usuario.pk
    if quien == _VENDEDOR:
        if es_vendedor:
            return
        raise PermissionDenied("Solo el vendedor del puesto puede realizar esta acción.")
    if es_comprador or es_vendedor:
        return
    raise PermissionDenied("Solo las partes del pedido pueden realizar esta acción.")


# ---------------------------------------------------------------------------
# Visibilidad / filtros / orden
# ---------------------------------------------------------------------------
def visibles_pedidos(usuario, queryset: QuerySet, params) -> QuerySet:
    """Cada cual ve lo suyo: comprador sus pedidos, vendedor los de sus puestos."""
    if usuario.is_authenticated and usuario.es_administrador:
        pass
    elif usuario.is_authenticated:
        queryset = queryset.filter(Q(id_comprador=usuario) | Q(id_puesto__id_vendedor=usuario))
    else:
        queryset = queryset.none()

    estado = params.get("estado")
    if estado:
        validar_estado_parametro(estado, Pedido.Estado.values)
        queryset = queryset.filter(estado=estado)

    tipo_entrega = params.get("tipo_entrega")
    if tipo_entrega:
        if tipo_entrega not in Pedido.TipoEntrega.values:
            raise ValidationError(
                {
                    "tipo_entrega": (
                        f"Valor inválido. Use uno de: {', '.join(Pedido.TipoEntrega.values)}."
                    )
                }
            )
        queryset = queryset.filter(tipo_entrega=tipo_entrega)

    puesto = parametro_entero(params, "puesto")
    if puesto:
        queryset = queryset.filter(id_puesto=puesto)
    return queryset
