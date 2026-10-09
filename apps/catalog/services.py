"""Reglas de negocio del catálogo.

Las reglas viven aquí (y no en los serializers) para que sean verificables
aisladamente desde tests y reutilizables por otras capas (admin, comandos):

1. Solo un vendedor aprobado puede crear/editar su Puesto.
2. Un Producto solo puede usar una categoría ya asignada a su Puesto.
3. Un Puesto con "ofrece domicilio" debe tener latitud y longitud.
7. No se elimina una categoría con productos activos (se desactiva).
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Max, Q, QuerySet

from apps.catalog.models import Categoria, ImagenProducto, Producto, Puesto, PuestoCategoria
from apps.common.query import parametro_booleano, parametro_entero, validar_estado_parametro

# Campos de consulta admitidos en el ordenamiento (whitelist anti-inyección
# de columnas: un valor fuera de lista no llega a ``order_by``).
ORDENAMIENTO_PRODUCTO = ("precio", "-precio", "nombre", "-nombre", "id", "-id")
ORDENAMIENTO_PUESTO = ("nombre", "-nombre", "id", "-id")

ERROR_DOMICILIO = "Un Puesto que ofrece domicilio debe registrar latitud y longitud."


# ---------------------------------------------------------------------------
# Regla 1
# ---------------------------------------------------------------------------
def crear_puesto(*, usuario, datos: dict) -> Puesto:
    if not usuario.puede_publicar():
        raise ValidationError(
            {
                "no_autorizado": (
                    "Solo los vendedores con identidad aprobada "
                    "pueden crear puestos (regla de negocio 1)."
                )
            }
        )
    _validar_domicilio(datos)
    return Puesto.objects.create(id_vendedor=usuario, **datos)


def actualizar_puesto(*, puesto: Puesto, usuario, datos: dict) -> Puesto:
    if not usuario.puede_publicar():
        raise ValidationError(
            {
                "no_autorizado": (
                    "Solo los vendedores con identidad aprobada "
                    "pueden editar puestos (regla de negocio 1)."
                )
            }
        )
    if puesto.id_vendedor_id != usuario.pk:
        raise ValidationError({"id_puesto": "Solo el dueño del puesto puede editarlo."})
    combinacion = {
        "ofrece_domicilio": datos.get("ofrece_domicilio", puesto.ofrece_domicilio),
        "latitud": datos.get("latitud", puesto.latitud),
        "longitud": datos.get("longitud", puesto.longitud),
    }
    _validar_domicilio(combinacion)
    for atributo, valor in datos.items():
        setattr(puesto, atributo, valor)
    puesto.full_clean()
    puesto.save()
    return puesto


def _validar_domicilio(datos: dict) -> None:
    """Regla 3 (defensa explícita además del CHECK de la base de datos)."""
    if datos.get("ofrece_domicilio") and (
        datos.get("latitud") is None or datos.get("longitud") is None
    ):
        raise ValidationError({"latitud": ERROR_DOMICILIO})


# ---------------------------------------------------------------------------
# Regla 2
# ---------------------------------------------------------------------------
def categoria_asignada(puesto: Puesto, categoria: Categoria) -> bool:
    return PuestoCategoria.objects.filter(id_puesto=puesto, id_categoria=categoria).exists()


def asignar_categoria(*, puesto: Puesto, categoria: Categoria) -> PuestoCategoria:
    """Asigna la categoría al puesto (idempotente)."""
    vinculo, _ = PuestoCategoria.objects.get_or_create(id_puesto=puesto, id_categoria=categoria)
    return vinculo


def quitar_categoria(*, puesto: Puesto, categoria: Categoria) -> None:
    """Quita la categoría; se bloquea si el puesto ya vende en ella.

    Dejar productos apuntando a una categoría que ya no está asignada
    violaría la regla 2 retroactivamente.
    """
    if puesto.productos.filter(id_categoria=categoria).exists():
        raise ValidationError(
            {
                "categoria": (
                    "El puesto tiene productos en esa categoría. "
                    "Reasigna o desactiva esos productos antes de quitarla."
                )
            }
        )
    eliminados, _ = PuestoCategoria.objects.filter(
        id_puesto=puesto, id_categoria=categoria
    ).delete()
    if eliminados == 0:
        raise ValidationError({"categoria": "La categoría no estaba asignada al puesto."})


def crear_producto(*, puesto: Puesto, categoria: Categoria, usuario, datos: dict) -> Producto:
    """``datos`` trae los campos escalares (nombre, precio, stock, ...).

    Los FK viajan aparte: el dueño del puesto lo decide la vista y la
    transferencia de productos entre puestos no existe en la API.
    """
    if not usuario.puede_publicar():
        raise ValidationError(
            {
                "no_autorizado": (
                    "Solo los vendedores con identidad aprobada "
                    "pueden publicar productos (regla de negocio 1)."
                )
            }
        )
    if puesto.id_vendedor_id != usuario.pk:
        raise ValidationError({"id_puesto": "El puesto no te pertenece."})
    _validar_precio(datos.get("precio"))
    if not categoria_asignada(puesto, categoria):
        raise ValidationError(
            {
                "id_categoria": (
                    "La categoría no está asignada al puesto. "
                    "Asignala primero (regla de negocio 2)."
                )
            }
        )
    producto = Producto(id_puesto=puesto, id_categoria=categoria, **datos)
    producto.full_clean()
    producto.save()
    return producto


def actualizar_producto(*, producto, usuario, datos: dict) -> Producto:
    """Aplica ``datos`` al producto validando las reglas 1 y 2.

    No permite mover un producto a otro puesto (no existe transferencia).
    """
    if not usuario.puede_publicar():
        raise ValidationError(
            {
                "no_autorizado": (
                    "Solo los vendedores con identidad aprobada "
                    "pueden editar productos (regla de negocio 1)."
                )
            }
        )
    if datos.get("id_puesto") not in (None, producto.id_puesto_id):
        raise ValidationError({"id_puesto": "No se puede mover un producto a otro puesto."})
    datos = {k: v for k, v in datos.items() if k != "id_puesto"}

    nueva_categoria = datos.get("id_categoria", producto.id_categoria)
    if nueva_categoria != producto.id_categoria and not categoria_asignada(
        producto.id_puesto, nueva_categoria
    ):
        raise ValidationError(
            {
                "id_categoria": (
                    "La categoría no está asignada al puesto. "
                    "Asignala primero (regla de negocio 2)."
                )
            }
        )
    if "precio" in datos:
        _validar_precio(datos["precio"])

    for atributo, valor in datos.items():
        setattr(producto, atributo, valor)
    producto.full_clean()
    producto.save()
    return producto


def _validar_precio(precio) -> None:
    """Acepta Decimal o str (lo que llegue del serializer o de tests directos)."""
    if precio is None:
        return
    try:
        precio = Decimal(str(precio))
    except Exception as exc:  # Decimal.InvalidOperation y similares
        raise ValidationError({"precio": "El precio no es un número válido."}) from exc
    if precio < Decimal("0"):
        raise ValidationError({"precio": "El precio no puede ser negativo."})


# ---------------------------------------------------------------------------
# Imágenes de producto
# ---------------------------------------------------------------------------
def agregar_imagen(*, producto, archivo) -> ImagenProducto:
    """Guarda la imagen asignando el siguiente ``orden`` del producto."""
    orden = producto.imagenes.aggregate(Max("orden"))["orden__max"] or 0
    return ImagenProducto.objects.create(id_producto=producto, archivo=archivo, orden=orden + 1)


# ---------------------------------------------------------------------------
# Regla 7
# ---------------------------------------------------------------------------
def eliminar_categoria(*, categoria: Categoria) -> None:
    if categoria.productos.filter(estado="activo").exists():
        raise ValidationError(
            {
                "categoria": (
                    "La categoría tiene productos activos: en vez de eliminarla, "
                    "desactívala (activa=false) (regla de negocio 7)."
                )
            }
        )
    try:
        with transaction.atomic():
            categoria.delete()
    except IntegrityError as exc:
        # Productos inactivos o puestos siguen referenciándola (FK PROTECT).
        raise ValidationError(
            {
                "categoria": (
                    "La categoría está en uso por productos o puestos: "
                    "desactívala en vez de eliminarla (regla de negocio 7)."
                )
            }
        ) from exc


# ---------------------------------------------------------------------------
# Búsqueda / ordenamiento / visibilidad
# ---------------------------------------------------------------------------
def visibles_puestos(usuario, queryset: QuerySet, params) -> QuerySet:
    """Visibilidad por rol + filtro ``?estado=`` (sin fuga de datos).

    Un público que pida ``?estado=suspendido`` obtiene vacío (nunca puestos
    suspendidos de terceros); el dueño sí ve los suyos en cualquier estado.
    """
    if usuario.is_authenticated and usuario.es_administrador:
        pass
    elif usuario.is_authenticated:
        queryset = queryset.filter(Q(estado=Puesto.Estado.ACTIVO) | Q(id_vendedor=usuario))
    else:
        queryset = queryset.filter(estado=Puesto.Estado.ACTIVO)

    estado = params.get("estado")
    if estado:
        validar_estado_parametro(estado, Puesto.Estado.values)
        queryset = queryset.filter(estado=estado)
    return queryset


def visibles_productos(usuario, queryset: QuerySet, params) -> QuerySet:
    """Igual que ``visibles_puestos`` pero con la cadena Producto→Puesto."""
    if usuario.is_authenticated and usuario.es_administrador:
        pass
    elif usuario.is_authenticated:
        queryset = queryset.filter(
            Q(estado=Producto.Estado.ACTIVO, id_puesto__estado=Puesto.Estado.ACTIVO)
            | Q(id_puesto__id_vendedor=usuario)
        )
    else:
        queryset = queryset.filter(
            estado=Producto.Estado.ACTIVO, id_puesto__estado=Puesto.Estado.ACTIVO
        )

    estado = params.get("estado")
    if estado:
        validar_estado_parametro(estado, Producto.Estado.values)
        queryset = queryset.filter(estado=estado)
    return queryset


def visibles_imagenes(usuario, queryset: QuerySet) -> QuerySet:
    if usuario.is_authenticated and usuario.es_administrador:
        return queryset
    if usuario.is_authenticated:
        return queryset.filter(
            Q(
                id_producto__estado=Producto.Estado.ACTIVO,
                id_producto__id_puesto__estado=Puesto.Estado.ACTIVO,
            )
            | Q(id_producto__id_puesto__id_vendedor=usuario)
        )
    return queryset.filter(
        id_producto__estado=Producto.Estado.ACTIVO,
        id_producto__id_puesto__estado=Puesto.Estado.ACTIVO,
    )


def filtrar_puestos(queryset: QuerySet, params) -> QuerySet:
    """``?q= &categoria= &vendedor= &domicilio=`` sobre puestos."""
    consulta = params.get("q")
    if consulta:
        queryset = queryset.filter(
            Q(nombre__icontains=consulta)
            | Q(descripcion__icontains=consulta)
            | Q(direccion__icontains=consulta)
        )
    categoria = parametro_entero(params, "categoria")
    if categoria:
        queryset = queryset.filter(categorias_asignadas__id_categoria=categoria)
    vendedor = parametro_entero(params, "vendedor")
    if vendedor:
        queryset = queryset.filter(id_vendedor=vendedor)
    domicilio = parametro_booleano(params, "domicilio")
    if domicilio is not None:
        queryset = queryset.filter(ofrece_domicilio=domicilio)
    return queryset.distinct()


def filtrar_productos(queryset: QuerySet, params) -> QuerySet:
    """``?q= &categoria= &puesto= &precio_min= &precio_max=``."""
    consulta = params.get("q")
    if consulta:
        queryset = queryset.filter(
            Q(nombre__icontains=consulta) | Q(descripcion__icontains=consulta)
        )
    categoria = parametro_entero(params, "categoria")
    if categoria:
        queryset = queryset.filter(id_categoria=categoria)
    puesto = parametro_entero(params, "puesto")
    if puesto:
        queryset = queryset.filter(id_puesto=puesto)
    if params.get("precio_min"):
        queryset = queryset.filter(precio__gte=_decimal(params["precio_min"], "precio_min"))
    if params.get("precio_max"):
        queryset = queryset.filter(precio__lte=_decimal(params["precio_max"], "precio_max"))
    return queryset


def _decimal(valor, nombre: str) -> Decimal:
    try:
        return Decimal(str(valor))
    except Exception as exc:
        raise ValidationError({nombre: "Debe ser un número válido."}) from exc
