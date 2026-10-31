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
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F, Q, QuerySet
from django.utils import timezone

from apps.catalog.models import Producto, Puesto
from apps.common import pricing
from apps.common.query import parametro_booleano, parametro_entero, validar_estado_parametro
from apps.orders import permissions
from apps.orders.models import ItemPedido, Pedido
from apps.rbac.acceso import tiene_recurso

logger = logging.getLogger(__name__)

# Productos por encargo (ADR-013).
MAX_CANTIDAD_ENCARGO = 20
MAX_LONGITUD_DETALLES = 300
DIAS_MAXIMOS_ANTICIPACION = 60
# El reloj del celular y el tiempo de llenar el formulario no deben tumbar una fecha pedida
# «justo» en el mínimo.
TOLERANCIA_FECHA_MINUTOS = 5

# Campos de consulta admitidos en el ordenamiento (whitelist anti-inyección).
ORDENAMIENTO_PEDIDO = ("fecha_creacion", "-fecha_creacion", "total", "-total", "id", "-id")

# Máquina de estados de la regla 5: tipo de entrega -> estado -> destinos permitidos.
# Domicilio sale del puesto «en camino»; en retiro nadie lo lleva: queda «listo para
# recoger» hasta que el cliente pasa por el puesto (ver docs/ADR-009).
TRANSICIONES_POR_TIPO: dict[str, dict[str, tuple[str, ...]]] = {
    Pedido.TipoEntrega.DOMICILIO: {
        Pedido.Estado.PENDIENTE: (Pedido.Estado.CONFIRMADO, Pedido.Estado.CANCELADO),
        Pedido.Estado.CONFIRMADO: (Pedido.Estado.EN_PREPARACION, Pedido.Estado.CANCELADO),
        Pedido.Estado.EN_PREPARACION: (Pedido.Estado.EN_CAMINO, Pedido.Estado.CANCELADO),
        Pedido.Estado.EN_CAMINO: (Pedido.Estado.ENTREGADO,),
        Pedido.Estado.LISTO_PARA_RECOGER: (),
        Pedido.Estado.ENTREGADO: (),
        Pedido.Estado.CANCELADO: (),
    },
    Pedido.TipoEntrega.RETIRO: {
        Pedido.Estado.PENDIENTE: (Pedido.Estado.CONFIRMADO, Pedido.Estado.CANCELADO),
        Pedido.Estado.CONFIRMADO: (Pedido.Estado.EN_PREPARACION, Pedido.Estado.CANCELADO),
        Pedido.Estado.EN_PREPARACION: (Pedido.Estado.LISTO_PARA_RECOGER, Pedido.Estado.CANCELADO),
        Pedido.Estado.EN_CAMINO: (),
        Pedido.Estado.LISTO_PARA_RECOGER: (Pedido.Estado.ENTREGADO, Pedido.Estado.CANCELADO),
        Pedido.Estado.ENTREGADO: (),
        Pedido.Estado.CANCELADO: (),
    },
}


def transiciones_de(pedido: Pedido) -> dict[str, tuple[str, ...]]:
    """Tabla de transiciones (estado -> destinos) que aplica al tipo de entrega del pedido."""
    return TRANSICIONES_POR_TIPO[pedido.tipo_entrega]


# ---------------------------------------------------------------------------
# Regla 4: creación
# ---------------------------------------------------------------------------
def crear_pedido(*, usuario, datos: dict) -> Pedido:
    """Crea un pedido descontando stock atómicamente y congelando precios.

    ``datos``: ``id_puesto`` (instancia), ``tipo_entrega``,
    ``direccion_entrega``, ``referencia_entrega``, ``notas``, ``fecha_solicitada`` (solo
    cuenta si hay productos por encargo) e ``items`` (lista de ``{"id_producto": Producto,
    "cantidad": int, "detalles": str}``; ``detalles`` solo se guarda en los encargos).

    Un producto con stock se valida y se descuenta como siempre. Un producto por encargo no
    usa stock: se valida su cantidad máxima, sus detalles y la fecha pedida.
    """
    permissions.exigir(
        usuario,
        permissions.Accion.CREAR,
        mensaje="Solo los compradores activos pueden crear pedidos.",
    )
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
        encargos = []
        for producto, cantidad, detalles in _iterar_lineas(lineas, productos, puesto):
            if producto.modalidad == Producto.Modalidad.ENCARGO:
                # Sin stock: no se valida ni se descuenta (ADR-013).
                _validar_linea_de_encargo(producto, cantidad, detalles)
                encargos.append(producto)
                detalles_del_item = detalles
            else:
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
                detalles_del_item = ""
            subtotal += producto.precio * cantidad
            items_a_crear.append((producto, cantidad, producto.modalidad, detalles_del_item))

        ahora = timezone.now()
        pedido.fecha_solicitada = _resolver_fecha_solicitada(
            datos.get("fecha_solicitada"), encargos, puesto, ahora
        )
        if tipo_entrega == Pedido.TipoEntrega.RETIRO:
            # Apartar con plazo (ADR-012): si el puesto no lo confirma a tiempo, se cancela solo.
            # Un encargo debe aceptarse antes de la fecha pedida, no después.
            pedido.vence_en = ahora + timedelta(hours=settings.PEDIDOS_PLAZO_CONFIRMACION_HORAS)
            if pedido.fecha_solicitada is not None:
                pedido.vence_en = min(pedido.vence_en, pedido.fecha_solicitada)
        pedido.subtotal = subtotal
        cupon, descuento = _resolver_cupon(usuario, puesto, datos.get("codigo_cupon"), subtotal)
        pedido.id_cupon = cupon
        pedido.descuento_cupon = descuento
        pedido.total = subtotal + pedido.tarifa_domicilio - descuento
        pedido.full_clean()
        pedido.save()
        ItemPedido.objects.bulk_create(
            [
                ItemPedido(
                    id_pedido=pedido,
                    id_producto=producto,
                    nombre_producto=producto.nombre,
                    unidad_medida=producto.unidad_medida,
                    precio_unitario=producto.precio,
                    cantidad=cantidad,
                    modalidad=modalidad,
                    detalles=detalles,
                )
                for producto, cantidad, modalidad, detalles in items_a_crear
            ]
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
    permissions.exigir(usuario, permissions.Accion.EDITAR, pedido)
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


def _normalizar_items(items) -> list[tuple]:
    """Consolida cantidades repetidas y valida la forma de cada línea.

    Devuelve ``(producto, cantidad, detalles)``. Una línea repetida suma sus cantidades; los
    detalles se escriben una sola vez por producto (una línea por producto, ADR-013).
    """
    if not items:
        raise ValidationError({"items": "El pedido debe incluir al menos un producto."})
    acumulados: dict[int, int] = {}
    detalles_por_producto: dict[int, str] = {}
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
        detalles = linea.get("detalles")
        if detalles is None:
            detalles = ""
        if not isinstance(detalles, str):
            raise ValidationError({"items": "Los detalles deben ser texto."})
        detalles = detalles.strip()
        if len(detalles) > MAX_LONGITUD_DETALLES:
            raise ValidationError(
                {"items": f"Los detalles pueden tener hasta {MAX_LONGITUD_DETALLES} caracteres."}
            )
        if clave not in acumulados:
            orden.append(clave)
            acumulados[clave] = 0
            detalles_por_producto[clave] = ""
        acumulados[clave] += cantidad
        anteriores = detalles_por_producto[clave]
        if detalles and anteriores and detalles != anteriores:
            raise ValidationError({"items": "Escribe los detalles una sola vez por producto."})
        detalles_por_producto[clave] = detalles or anteriores
    return [(clave, acumulados[clave], detalles_por_producto[clave]) for clave in orden]


def _bloquear_productos(lineas) -> dict[int, Producto]:
    """Bloquea las filas de producto en orden de PK (evita interbloqueos)."""
    claves = sorted(linea[0] for linea in lineas)
    filas = list(Producto.objects.select_for_update().filter(pk__in=claves).order_by("pk"))
    if len(filas) != len(claves):
        raise ValidationError({"items": "Hay productos que ya no existen."})
    return {fila.pk: fila for fila in filas}


def _iterar_lineas(lineas, productos: dict[int, Producto], puesto: Puesto):
    for clave, cantidad, detalles in lineas:
        producto = productos[clave]
        if producto.estado != Producto.Estado.ACTIVO:
            raise ValidationError({"items": f"'{producto.nombre}' no está disponible."})
        if producto.id_puesto_id != puesto.pk:
            raise ValidationError({"items": f"'{producto.nombre}' no pertenece a ese puesto."})
        yield producto, cantidad, detalles


def _validar_linea_de_encargo(producto: Producto, cantidad: int, detalles: str) -> None:
    """Un encargo no tiene stock, pero sí tope de unidades y detalles si el puesto los pide."""
    if cantidad > MAX_CANTIDAD_ENCARGO:
        raise ValidationError(
            {
                "items": (
                    f"Puedes encargar hasta {MAX_CANTIDAD_ENCARGO} unidades de '{producto.nombre}'."
                )
            }
        )
    if producto.pide_detalles and not detalles:
        etiqueta = (producto.etiqueta_detalles or "detalles del encargo").strip()
        etiqueta = etiqueta[:1].lower() + etiqueta[1:]
        raise ValidationError({"items": f"Escribe {etiqueta} para '{producto.nombre}'."})


def _resolver_fecha_solicitada(fecha, encargos: list[Producto], puesto: Puesto, ahora):
    """Fecha pedida del pedido: obligatoria con encargos, ignorada sin ellos (ADR-013).

    Mínimo: ahora + la mayor preparación entre los encargos (con 5 minutos de tolerancia).
    Máximo: 60 días. Un valor sin zona horaria se toma como hora de Colombia.
    """
    if not encargos:
        return None
    if fecha is None:
        raise ValidationError({"fecha_solicitada": "Elige para cuándo lo necesitas."})
    if timezone.is_naive(fecha):
        fecha = timezone.make_aware(fecha)
    horas = max(producto.preparacion_horas or 0 for producto in encargos)
    minima = ahora + timedelta(hours=horas)
    if fecha < minima - timedelta(minutes=TOLERANCIA_FECHA_MINUTOS):
        from apps.notifications.services import formatear_cuando

        desde = formatear_cuando(minima)
        if not desde.endswith("."):
            desde += "."
        raise ValidationError(
            {
                "fecha_solicitada": (
                    f"{puesto.nombre} necesita al menos {horas} horas para prepararlo. "
                    f"Elige desde el {desde}"
                )
            }
        )
    if fecha > ahora + timedelta(days=DIAS_MAXIMOS_ANTICIPACION):
        raise ValidationError(
            {
                "fecha_solicitada": (
                    f"Solo se aceptan encargos para los próximos {DIAS_MAXIMOS_ANTICIPACION} días."
                )
            }
        )
    return fecha


def _reponer_stock(pedido: Pedido) -> None:
    """Regla 4: cancelar repone el stock exactamente una vez (por transición).

    Solo repone los ítems ``stock``: son los únicos que descontaron existencias al crear el
    pedido. Un ítem por encargo nunca descontó nada, así que no se repone (ADR-013). Se usa la
    modalidad guardada en el ítem, no la actual del producto: si el vendedor cambió el producto
    después, el pedido sigue siendo lo que era cuando se hizo.

    Se suma en la base con ``F()``: una copia vieja del producto no pisa una venta concurrente.
    """
    items = pedido.items.filter(modalidad=Producto.Modalidad.STOCK)
    for producto_id, cantidad in items.values_list("id_producto_id", "cantidad"):
        Producto.objects.filter(pk=producto_id).update(stock=F("stock") + cantidad)


def _liberar_cupon(pedido: Pedido) -> None:
    """Un pedido cancelado no consume usos del cupón (límites totales y por usuario)."""
    from apps.promotions.models import UsoCupon

    UsoCupon.objects.filter(id_pedido=pedido).delete()


# ---------------------------------------------------------------------------
# Regla 5: máquina de estados
# ---------------------------------------------------------------------------
def confirmar_pedido(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.CONFIRMADO)


def iniciar_preparacion(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.EN_PREPARACION)


def marcar_enviado(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.EN_CAMINO)


def marcar_listo_para_recoger(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.LISTO_PARA_RECOGER)


def marcar_entregado(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.ENTREGADO)


def cancelar_pedido(*, pedido: Pedido, usuario) -> Pedido:
    return _transicionar(pedido=pedido, usuario=usuario, destino=Pedido.Estado.CANCELADO)


def reportar_no_recibido(*, pedido: Pedido, usuario, motivo: str = "") -> Pedido:
    """El comprador avisa que el pedido a domicilio no le llegó.

    No cambia el estado: si el pedido llega después, el comprador todavía puede
    confirmar la entrega. Solo se permite una vez y mientras esté en camino; un
    retiro no lo admite (el cliente va al puesto y el vendedor lo entrega en mano).
    """
    permissions.exigir(
        usuario,
        permissions.Accion.NO_RECIBIDO,
        pedido,
        mensaje="Solo el comprador del pedido puede reportar que no lo recibió.",
    )
    if pedido.tipo_entrega != Pedido.TipoEntrega.DOMICILIO:
        raise ValidationError({"estado": "Solo se puede reportar un pedido a domicilio."})
    if pedido.estado != Pedido.Estado.EN_CAMINO:
        raise ValidationError({"estado": "Solo se puede reportar un pedido que esté en camino."})
    if pedido.no_recibido_en is not None:
        raise ValidationError({"no_recibido": "Ya reportaste que este pedido no te llegó."})
    motivo = (motivo or "").strip()
    if len(motivo) > 200:
        raise ValidationError({"motivo": "El motivo no puede superar 200 caracteres."})
    pedido.no_recibido_en = timezone.now()
    pedido.motivo_no_recibido = motivo
    pedido.save(update_fields=["no_recibido_en", "motivo_no_recibido", "fecha_actualizacion"])
    _notificar_no_recibido(pedido)
    _auditar(usuario, "no_recibido", pedido, {"motivo": motivo})
    return pedido


def _validar_transicion(pedido: Pedido, destino: str) -> None:
    permitidas = transiciones_de(pedido)[pedido.estado]
    if destino not in permitidas:
        if pedido.estado == Pedido.Estado.CANCELADO and pedido.motivo_cancelacion:
            # El barrido canceló el pedido mientras el vendedor lo tenía abierto.
            raise ValidationError(
                {
                    "estado": (
                        "Este pedido se canceló solo porque venció su plazo. "
                        "Pídele al cliente que haga uno nuevo."
                    )
                }
            )
        raise ValidationError(
            {
                "estado": (
                    f"Transición inválida: '{pedido.estado}' → '{destino}'. "
                    f"Permitidas desde aquí: {', '.join(permitidas) or 'ninguna'}."
                )
            }
        )


def _transicionar(*, pedido: Pedido, usuario, destino: str) -> Pedido:
    _validar_transicion(pedido, destino)
    permissions.exigir(usuario, permissions.ACCION_POR_DESTINO[destino], pedido)
    if destino == Pedido.Estado.CONFIRMADO:
        _exigir_pago_para_confirmar(pedido)
    estado_anterior = _aplicar_transicion(pedido=pedido, destino=destino, usuario=usuario)
    _notificar_cambio_estado(pedido, estado_anterior)
    _auditar(usuario, "transicion", pedido, {"de": estado_anterior, "a": destino})
    return pedido


def _aplicar_transicion(
    *, pedido: Pedido, destino: str, usuario, motivo_cancelacion: str = ""
) -> str:
    """Cambia el estado del pedido y todo lo que va con él; devuelve el estado anterior.

    Stock + cupón + pago + estado en una sola transacción: o pasa todo o no pasa nada. El
    pedido se bloquea y se relee: dos peticiones simultáneas (o una instancia vieja) no
    repiten la reposición de stock ni pisan un estado más reciente.

    La usan las personas (``_transicionar``, que ya validó permisos) y el barrido de pedidos
    vencidos (``usuario=None``: el sistema; no cobra en mano). No duplica la reposición de
    stock, cupón ni pago: es el único camino para cancelar.
    """
    with transaction.atomic():
        actual = (
            Pedido.objects.select_for_update()
            .only("estado", "motivo_cancelacion")
            .get(pk=pedido.pk)
        )
        if actual.estado != pedido.estado:
            pedido.estado = actual.estado
            pedido.motivo_cancelacion = actual.motivo_cancelacion
            _validar_transicion(pedido, destino)
        estado_anterior = pedido.estado
        if (
            destino == Pedido.Estado.ENTREGADO
            and pedido.tipo_entrega == Pedido.TipoEntrega.RETIRO
            and usuario is not None
        ):
            _cerrar_cobro_en_mano(pedido, usuario)
        if destino == Pedido.Estado.CANCELADO:
            _reponer_stock(pedido)
            _liberar_cupon(pedido)
            _reembolsar_o_anular_pago(pedido)
            pedido.motivo_cancelacion = motivo_cancelacion
        pedido.estado = destino
        pedido.vence_en = _plazo_al_pasar_a(pedido, destino)
        pedido.aviso_vencimiento_en = None
        campos = ["estado", "vence_en", "aviso_vencimiento_en", "fecha_actualizacion"]
        if destino == Pedido.Estado.CANCELADO:
            campos.append("motivo_cancelacion")
        pedido.save(update_fields=campos)
    return estado_anterior


def _plazo_al_pasar_a(pedido: Pedido, destino: str):
    """``vence_en`` del pedido al llegar a ``destino`` (ADR-012).

    Solo «listo para recoger» con el efectivo aún sin cobrar tiene plazo (el del puesto);
    cualquier otro destino lo quita: el puesto ya aceptó, se cobró, se entregó o se canceló.
    En un encargo el plazo cuenta desde la fecha pedida si todavía no llegó (ADR-013).
    """
    if destino != Pedido.Estado.LISTO_PARA_RECOGER or not _cobro_en_mano_pendiente_en_bd(pedido):
        return None
    ahora = timezone.now()
    inicio = max(ahora, pedido.fecha_solicitada) if pedido.fecha_solicitada else ahora
    horas = (
        Puesto.objects.filter(pk=pedido.id_puesto_id)
        .values_list("plazo_retiro_horas", flat=True)
        .first()
    )
    return inicio + timedelta(hours=horas or 24)


def _cobro_en_mano_pendiente_en_bd(pedido: Pedido) -> bool:
    """Como ``_cobro_en_mano_pendiente`` pero releyendo el pago (no el ``pedido.pago`` cacheado)."""
    from apps.payments.models import Pago

    pago = Pago.objects.filter(id_pedido=pedido).first()
    return (
        pedido.tipo_entrega == Pedido.TipoEntrega.RETIRO
        and pago is not None
        and pago.metodo_pago == Pago.MetodoPago.EFECTIVO
        and pago.estado in (Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
    )


def _exigir_pago_para_confirmar(pedido: Pedido) -> None:
    """Regla de negocio (Fase 4): para confirmar, el pago debe estar aprobado.

    Aplica a todos los métodos: en efectivo el vendedor/admin aprueba el cobro
    con ``payments.confirmar_efectivo``; con pasarela, el pago se aprueba al
    simular (sandbox) o vía webhook.

    Excepción (pagar al recoger, ADR-009): un RETIRO con pago en efectivo
    registrado (pendiente o procesando) se puede confirmar sin cobro previo; el
    vendedor cobra al entregar. Cualquier otro método, y todo domicilio, exige el
    pago aprobado.
    """
    from apps.payments.models import Pago

    pago = Pago.objects.filter(id_pedido=pedido).first()
    if pago is None:
        raise ValidationError(
            {"pago": "El pedido requiere un pago registrado y aprobado antes de confirmarse."}
        )
    if pago.estado == Pago.Estado.APROBADO:
        return
    if (
        pedido.tipo_entrega == Pedido.TipoEntrega.RETIRO
        and pago.metodo_pago == Pago.MetodoPago.EFECTIVO
        and pago.estado in (Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
    ):
        return
    raise ValidationError(
        {"pago": f"El pago está en estado '{pago.estado}': debe estar aprobado para confirmar."}
    )


def _cerrar_cobro_en_mano(pedido: Pedido, usuario) -> None:
    """Al entregar un retiro pagado en efectivo, el vendedor (o admin) confirma el cobro.

    Corre dentro de la transacción de la transición: si el cobro falla, el pedido no
    queda entregado. El comprador no puede aprobar su propio efectivo: si el pago
    sigue pendiente, debe entregarlo el vendedor.
    """
    from apps.payments import services as pagos_services
    from apps.payments.models import Pago

    pago = Pago.objects.filter(id_pedido=pedido).first()
    if (
        pago is None
        or pago.metodo_pago != Pago.MetodoPago.EFECTIVO
        or pago.estado not in (Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
    ):
        return
    if not _puede_cobrar(pedido, usuario):
        raise ValidationError(
            {"pago": "El pago en efectivo sigue pendiente: el vendedor debe confirmar el cobro."}
        )
    pagos_services.confirmar_efectivo(pago=pago, usuario=usuario)


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


def _notificar_no_recibido(pedido: Pedido) -> None:
    from apps.notifications import services as notif

    try:
        notif.notificar_no_recibido(pedido=pedido)
    except Exception:  # pragma: no cover - la notificación no debe romper el pedido
        logger.exception("No se pudo notificar el reporte de no recibido del pedido %s", pedido.pk)


def acciones_disponibles(pedido: Pedido, usuario) -> list[str]:
    """Acciones que ``usuario`` puede ejecutar ahora (RBAC segun el estado)."""
    acciones: list[str] = []
    if pedido.estado == Pedido.Estado.PENDIENTE and permissions.puede(
        usuario, permissions.Accion.EDITAR, pedido
    ):
        acciones.append(permissions.Accion.EDITAR.value)
    for destino in transiciones_de(pedido).get(pedido.estado, ()):
        accion = permissions.ACCION_POR_DESTINO[destino]
        if not permissions.puede(usuario, accion, pedido):
            continue
        if (
            destino == Pedido.Estado.ENTREGADO
            and _cobro_en_mano_pendiente(pedido)
            and not _puede_cobrar(pedido, usuario)
        ):
            # El comprador no cierra su propio efectivo: se le oculta el botón (el servicio
            # igualmente lo rechazaría) y el vendedor entrega y cobra.
            continue
        acciones.append(accion)
    if (
        pedido.tipo_entrega == Pedido.TipoEntrega.DOMICILIO
        and pedido.estado == Pedido.Estado.EN_CAMINO
        and pedido.no_recibido_en is None
        and permissions.puede(usuario, permissions.Accion.NO_RECIBIDO, pedido)
    ):
        acciones.append(permissions.Accion.NO_RECIBIDO.value)
    if plazo_extensible(pedido) and permissions.puede(
        usuario, permissions.Accion.EXTENDER_PLAZO, pedido
    ):
        acciones.append(permissions.Accion.EXTENDER_PLAZO.value)
    acciones.extend(_acciones_de_pago(pedido, usuario))
    return acciones


def plazo_extensible(pedido: Pedido) -> bool:
    """El pedido tiene plazo, está en un estado con plazo y aún admite más tiempo."""
    return (
        pedido.tipo_entrega == Pedido.TipoEntrega.RETIRO
        and pedido.vence_en is not None
        and pedido.estado in (Pedido.Estado.PENDIENTE, Pedido.Estado.LISTO_PARA_RECOGER)
        and pedido.extensiones_plazo < Pedido.MAX_EXTENSIONES_PLAZO
    )


def horas_de_extension(pedido: Pedido) -> int | None:
    """Cuántas horas suma «Dar más tiempo» a este pedido (``None`` si no se puede)."""
    if not plazo_extensible(pedido):
        return None
    if pedido.estado == Pedido.Estado.PENDIENTE:
        return settings.PEDIDOS_PLAZO_CONFIRMACION_HORAS
    return pedido.id_puesto.plazo_retiro_horas


def _cobro_en_mano_pendiente(pedido: Pedido) -> bool:
    """Retiro con pago en efectivo aún sin cobrar (pendiente o procesando)."""
    pago = getattr(pedido, "pago", None)
    return (
        pedido.tipo_entrega == Pedido.TipoEntrega.RETIRO
        and pago is not None
        and pago.metodo_pago == "efectivo"
        and pago.estado in ("pendiente", "procesando")
    )


def _puede_cobrar(pedido: Pedido, usuario) -> bool:
    """Quién cierra el cobro en mano: el administrador o el vendedor dueño del puesto."""
    return usuario.es_administrador or pedido.id_puesto.id_vendedor_id == usuario.pk


def _acciones_de_pago(pedido: Pedido, usuario) -> list[str]:
    """``pagar`` (comprador/admin) y ``confirmar-pago`` (vendedor de ESE pedido o admin).

    Así el frontend no adivina por rol quién puede cobrar. ``pedido.pago`` viene en el
    ``select_related`` del listado: no añade consultas por fila.
    """
    if not (usuario and usuario.is_authenticated and usuario.is_active):
        return []
    pago = getattr(pedido, "pago", None)
    acciones: list[str] = []
    es_comprador = pedido.id_comprador_id == usuario.pk
    if (
        pedido.estado == Pedido.Estado.PENDIENTE
        and (es_comprador or usuario.es_administrador)
        and (pago is None or pago.estado == "rechazado")
    ):
        acciones.append("pagar")
    if (
        pago is not None
        and pago.metodo_pago == "efectivo"
        and pago.estado in ("pendiente", "procesando")
        and pedido.estado != Pedido.Estado.CANCELADO
    ):
        es_vendedor = pedido.id_puesto.id_vendedor_id == usuario.pk and usuario.puede_publicar()
        if es_vendedor or usuario.es_administrador:
            acciones.append("confirmar-pago")
    return acciones


# ---------------------------------------------------------------------------
# Visibilidad / filtros / orden
# ---------------------------------------------------------------------------
def visibles_pedidos(usuario, queryset: QuerySet, params) -> QuerySet:
    """Cada cual ve lo suyo: comprador sus pedidos, vendedor los de sus puestos."""
    if usuario.is_authenticated and tiene_recurso(usuario, "admin.pedidos"):
        pass
    elif usuario.is_authenticated:
        # Subconsulta en vez de OR sobre un join: permite usar los índices de las FK.
        queryset = queryset.filter(
            Q(id_comprador=usuario)
            | Q(id_puesto__in=Puesto.objects.filter(id_vendedor=usuario).values("pk"))
        )
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

    producto = parametro_entero(params, "producto")
    if producto:
        # Para avisar al vendedor cuántos pedidos tocan un producto antes de editarlo.
        queryset = queryset.filter(
            pk__in=ItemPedido.objects.filter(id_producto=producto).values("id_pedido")
        )

    abiertos = parametro_booleano(params, "abiertos")
    if abiertos is not None:
        finales = Pedido.ESTADOS_FINALES
        if abiertos:
            queryset = queryset.exclude(estado__in=finales)
        else:
            queryset = queryset.filter(estado__in=finales)

    con_no_recibido = parametro_booleano(params, "con_no_recibido")
    if con_no_recibido is not None:
        queryset = queryset.filter(no_recibido_en__isnull=not con_no_recibido)
    return queryset
