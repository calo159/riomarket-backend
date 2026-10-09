"""Reglas de negocio de las reseñas.

- Solo un comprador activo puede reseñar, y solo después de tener un pedido
  **entregado** de ese puesto (regla de reputación).
- Una sola reseña por (usuario, puesto): repetir es editar la existente.
- El vendedor dueño del puesto (o un admin) responde la reseña.
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import Avg, Count, Q, QuerySet
from django.utils import timezone

from apps.accounts.models import Usuario
from apps.catalog.models import Puesto
from apps.orders.models import Pedido
from apps.reviews.models import Resena

ORDENAMIENTO_RESENA = (
    "-fecha_creacion",
    "fecha_creacion",
    "-calificacion",
    "calificacion",
    "id",
    "-id",
)

_CAMPOS_EDITABLES = ("calificacion", "comentario")


def _auditar(usuario, accion: str, resena: Resena, detalle: dict | None = None) -> None:
    """Registra la acción en la auditoría (best-effort, nunca rompe la reseña)."""
    from apps.audit import services as audit

    audit.registrar(
        usuario=usuario,
        accion=accion,
        entidad="resena",
        id_entidad=resena.pk,
        detalle=detalle or {},
    )


def _exigir_comprador_activo(usuario) -> None:
    if not (usuario and usuario.is_active and usuario.rol == Usuario.Rol.COMPRADOR):
        raise PermissionDenied("Solo los compradores activos pueden reseñar.")


def _exigir_pedido_entregado(usuario, puesto: Puesto, id_pedido=None) -> None:
    if id_pedido is not None:
        if (
            id_pedido.id_comprador_id != usuario.pk
            or id_pedido.id_puesto_id != puesto.pk
            or id_pedido.estado != Pedido.Estado.ENTREGADO
        ):
            raise ValidationError(
                {"id_pedido": "Debe ser un pedido tuyo, entregado y de ese puesto."}
            )
        return
    if not Pedido.objects.filter(
        id_comprador=usuario, id_puesto=puesto, estado=Pedido.Estado.ENTREGADO
    ).exists():
        raise ValidationError(
            {"no_autorizado": "Solo puedes reseñar tras un pedido entregado de ese puesto."}
        )


def _exigir_dueno_o_admin(resena: Resena, usuario) -> None:
    if usuario.es_administrador:
        return
    if resena.id_usuario_id != usuario.pk:
        raise PermissionDenied("Solo el autor de la reseña puede modificarla.")


def _exigir_vendedor(resena: Resena, usuario) -> None:
    if usuario.es_administrador:
        return
    if resena.id_puesto.id_vendedor_id != usuario.pk:
        raise PermissionDenied("Solo el vendedor del puesto puede responder.")


def crear_resena(*, usuario, datos: dict) -> Resena:
    _exigir_comprador_activo(usuario)
    puesto = _normalizar_puesto(datos.pop("id_puesto", None))
    if puesto.estado != Puesto.Estado.ACTIVO:
        raise ValidationError({"id_puesto": "Ese puesto no está activo."})
    _exigir_pedido_entregado(usuario, puesto, datos.get("id_pedido"))
    if Resena.objects.filter(id_usuario=usuario, id_puesto=puesto).exists():
        raise ValidationError(
            {"no_autorizado": "Ya reseñaste ese puesto: actualiza tu reseña con PUT/PATCH."}
        )
    resena = Resena(id_usuario=usuario, id_puesto=puesto, **datos)
    resena.full_clean()
    resena.save()
    _auditar(usuario, "crear", resena, {"calificacion": resena.calificacion})
    return resena


def _normalizar_puesto(puesto):
    """Acepta instancia de Puesto o su PK (los tests de service pasan ambos)."""
    if isinstance(puesto, Puesto):
        return puesto
    if puesto is None:
        raise ValidationError({"id_puesto": "Debe indicar el puesto."})
    try:
        return Puesto.objects.get(pk=puesto)
    except Puesto.DoesNotExist as exc:
        raise ValidationError({"id_puesto": "Ese puesto no existe."}) from exc


def actualizar_resena(*, resena: Resena, usuario, datos: dict) -> Resena:
    _exigir_comprador_activo(usuario)
    _exigir_dueno_o_admin(resena, usuario)
    for campo in _CAMPOS_EDITABLES:
        if campo in datos:
            setattr(resena, campo, datos[campo])
    resena.full_clean()
    resena.save()
    _auditar(usuario, "actualizar", resena, {"calificacion": resena.calificacion})
    return resena


def responder_resena(*, resena: Resena, usuario, datos: dict) -> Resena:
    _exigir_vendedor(resena, usuario)
    respuesta = (datos.get("respuesta") or "").strip()
    if not respuesta:
        raise ValidationError({"respuesta": "La respuesta no puede estar vacía."})
    resena.respuesta = respuesta
    resena.fecha_respuesta = timezone.now()
    resena.full_clean()
    resena.save()
    _auditar(usuario, "responder", resena)
    return resena


def eliminar_resena(*, resena: Resena, usuario) -> None:
    _exigir_dueno_o_admin(resena, usuario)
    _auditar(usuario, "eliminar", resena)
    resena.delete()


def visibles_resenas(usuario, qs: QuerySet[Resena]) -> QuerySet[Resena]:
    """Admin: todas. Vendedor: las de sus puestos. Demás: solo visibles."""
    if usuario and usuario.is_authenticated and usuario.es_administrador:
        return qs
    if usuario and usuario.is_authenticated and usuario.rol == Usuario.Rol.VENDEDOR:
        return qs.filter(id_puesto__id_vendedor=usuario)
    return qs.filter(visible=True)


def filtrar_resenas(qs: QuerySet[Resena], params) -> QuerySet[Resena]:
    puesto = params.get("puesto")
    if puesto:
        if not puesto.isdigit():
            raise ValidationError({"puesto": "Debe ser un ID entero."})
        qs = qs.filter(id_puesto_id=int(puesto))
    cal_min = params.get("calificacion_min")
    cal_max = params.get("calificacion_max")
    if cal_min:
        qs = qs.filter(calificacion__gte=int(cal_min))
    if cal_max:
        qs = qs.filter(calificacion__lte=int(cal_max))
    if params.get("vendedor"):
        qs = qs.filter(id_puesto__id_vendedor_id=params.get("vendedor"))
    if params.get("con_respuesta") == "true":
        qs = qs.exclude(respuesta="")
    return qs


def anotar_reputacion(qs: QuerySet[Puesto]) -> QuerySet[Puesto]:
    """Añade ``calificacion_promedio`` y ``cantidad_resenas`` (solo visibles)."""
    visibles = Q(resenas__visible=True)
    return qs.annotate(
        calificacion_promedio=Avg("resenas__calificacion", filter=visibles),
        cantidad_resenas=Count("resenas", filter=visibles, distinct=True),
    )
