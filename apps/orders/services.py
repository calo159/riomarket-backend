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

import logging
from decimal import Decimal

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Q, QuerySet

from apps.accounts.models import Usuario
from apps.catalog.models import Producto, Puesto
from apps.common import pricing
from apps.common.query import parametro_entero, validar_estado_parametro
from apps.orders.models import ItemPedido, Pedido

logger = logging.getLogger(__name__)

# Campos de consulta admitidos en el ordenamiento (whitelist anti-inyección).
ORDENAMIENTO_PEDIDO = ("fecha_creacion", "-fecha_creacion", "total", "-total", "id", "-id")

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
    direccion_texto = (datos.get("direccion_entrega") or "").strip()
    referencia = (datos.get("referencia_entrega") or "").strip()
    if puesto.estado != Puesto.Estado.ACTIVO:
        raise ValidationError({"id_puesto": "Ese puesto no está activo."})
    if tipo_entrega not in Pedido.TipoEntrega.values:
        raise ValidationError({"tipo_entrega": f"Tipo de entrega inválido: {tipo_entrega}."})
    direccion_guardada = _resolver_direccion(usuario, datos.get("id_direccion"))
    if tipo_entrega == Pedido.TipoEntrega.DOMICILIO:
        if not puesto.ofrece_domicilio:
            raise ValidationError({"tipo_entrega": "Ese puesto no ofrece servicio a domicilio."})
        if direccion_guardada is not None:
            direccion_texto = direccion_texto or direccion_guardada.direccion
            referencia = referencia or direccion_guardada.referencia
        if not direccion_texto:
            raise ValidationError(
                {"direccion_entrega": "Un pedido a domicilio debe indicar la dirección."}
            )

    with transaction.atomic():
        productos = _bloquear_productos(lineas)
        subtotal = Decimal("0.00")
        # Fuente única de montos: la MISMA función que usa payments para el pago.
        tarifa = pricing.tarifa_domicilio(es_domicilio=tipo_entrega == Pedido.TipoEntrega.DOMICILIO)
        pedido = Pedido(
            id_comprador=usuario,
            id_puesto=puesto,
            tipo_entrega=tipo_entrega,
            direccion_entrega=direccion_texto,
            referencia_entrega=referencia,
            id_direccion=direccion_guardada,
            latitud_entrega=direccion_guardada.latitud if direccion_guardada else None,
            longitud_entrega=direccion_guardada.longitud if direccion_guardada else None,
            notas=datos.get("notas") or "",
            tarifa_domicilio=tarifa,
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
        cupon, descuento = _resolver_cupon(usuario, puesto, datos.get("codigo_cupon"), subtotal)
        pedido.id_cupon = cupon
        pedido.descuento_cupon = descuento
        pedido.total = subtotal + pedido.tarifa_domicilio - descuento
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
        if cupon is not None:
            from apps.promotions import services as promos_services

            promos_services.registrar_uso(
                cupon=cupon, usuario=usuario, pedido=pedido, descuento=descuento
            )
    _notificar_pedido_creado(pedido)
    _auditar(usuario, "crear", pedido, {"total": str(pedido.total), "cupon": pedido.id_cupon_id})
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
    if "id_direccion" in datos:
        direccion_guardada = _resolver_direccion(usuario, datos.get("id_direccion"))
        pedido.id_direccion = direccion_guardada
        if direccion_guardada is not None:
            pedido.latitud_entrega = direccion_guardada.latitud
            pedido.longitud_entrega = direccion_guardada.longitud
            if pedido.tipo_entrega == Pedido.TipoEntrega.DOMICILIO:
                pedido.direccion_entrega = (
                    pedido.direccion_entrega or direccion_guardada.direccion
                ).strip()
        else:
            pedido.latitud_entrega = None
            pedido.longitud_entrega = None
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
    if destino == Pedido.Estado.CONFIRMADO:
        _exigir_pago_aprobado(pedido)
    estado_anterior = pedido.estado
    # Stock + estado en una sola transacción: o pasa todo o no pasa nada.
    with transaction.atomic():
        if destino == Pedido.Estado.CANCELADO:
            _reponer_stock(pedido)
            _reembolsar_o_anular_pago(pedido)
        pedido.estado = destino
        pedido.save(update_fields=["estado", "fecha_actualizacion"])
    _notificar_cambio_estado(pedido, estado_anterior)
    _auditar(usuario, "transicion", pedido, {"de": estado_anterior, "a": destino})
    return pedido


def _exigir_pago_aprobado(pedido: Pedido) -> None:
    """Regla de negocio (Fase 4): para confirmar, el pago debe estar aprobado.

    Aplica a todos los métodos: en efectivo el vendedor/admin aprueba el cobro
    con ``payments.confirmar_efectivo``; con pasarela, el pago se aprueba al
    simular (sandbox) o vía webhook.
    """
    from apps.payments.models import Pago

    pago = Pago.objects.filter(id_pedido=pedido).first()
    if pago is None:
        raise ValidationError(
            {"pago": "El pedido requiere un pago registrado y aprobado antes de confirmarse."}
        )
    if pago.estado != Pago.Estado.APROBADO:
        raise ValidationError(
            {"pago": f"El pago está en estado '{pago.estado}': debe estar aprobado para confirmar."}
        )


def _reembolsar_o_anular_pago(pedido: Pedido) -> None:
    """Al cancelar: reembolsa el pago aprobado o anula el que sigue en curso."""
    from apps.payments import services as pagos_services

    pagos_services.reembolsar_o_anular_por_cancelacion(pedido=pedido)


def _resolver_direccion(usuario, direccion):
    """Valida que la dirección guardada pertenezca al usuario y esté activa."""
    if direccion is None:
        return None
    if direccion.id_usuario_id != usuario.pk:
        raise ValidationError({"id_direccion": "Esa dirección no te pertenece."})
    if not direccion.activa:
        raise ValidationError({"id_direccion": "Esa dirección está inactiva."})
    return direccion


def _resolver_cupon(usuario, puesto, codigo, subtotal):
    """Aplica el cupón (bloqueando su fila) si se envió uno; si no, no aplica."""
    codigo = (codigo or "").strip()
    if not codigo:
        return None, Decimal("0.00")
    from apps.promotions import services as promos_services

    return promos_services.aplicar_cupon(
        usuario=usuario, codigo=codigo, puesto=puesto, subtotal=subtotal
    )


def _auditar(usuario, accion: str, pedido: Pedido, detalle: dict | None = None) -> None:
    """Registra la acción en la auditoría (best-effort, nunca rompe el pedido)."""
    from apps.audit import services as audit

    audit.registrar(
        usuario=usuario,
        accion=accion,
        entidad="pedido",
        id_entidad=pedido.pk,
        detalle=detalle or {},
    )


def _notificar_pedido_creado(pedido: Pedido) -> None:
    from apps.notifications import services as notif

    try:
        notif.notificar_pedido_creado(pedido=pedido)
    except Exception:  # pragma: no cover - la notificación no debe romper el pedido
        logger.exception("No se pudo notificar la creación del pedido %s", pedido.pk)


def _notificar_cambio_estado(pedido: Pedido, estado_anterior: str) -> None:
    from apps.notifications import services as notif

    try:
        notif.notificar_cambio_estado_pedido(pedido=pedido, estado_anterior=estado_anterior)
    except Exception:  # pragma: no cover - la notificación no debe romper el pedido
        logger.exception("No se pudo notificar el cambio de estado del pedido %s", pedido.pk)


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
