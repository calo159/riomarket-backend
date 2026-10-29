"""Reglas de negocio de la administración de usuarios.

Toda decisión sensible (cambio de rol, suspensión, reactivación) vive aquí
para que sea verificable y para que la API no pueda saltársela. Reglas:

- Nadie cambia su propio rol ni se suspende a sí mismo (evita autobloqueos).
- No se puede degradar/suspender al último administrador activo.
- No se cambia el rol de un comprador con pedidos activos ni el de un
  vendedor con pedidos activos en sus puestos (habría pedidos huérfanos).
- Al cambiar de rol o suspender se revocan las sesiones vigentes (blacklist).
- Cada decisión deja notificación al afectado y registro de auditoría.
"""

import logging
from decimal import Decimal

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.accounts.models import Usuario, Vendedor
from apps.audit.services import registrar
from apps.catalog.models import Producto, Puesto
from apps.notifications.models import Notificacion
from apps.notifications.services import crear_notificacion
from apps.orders.models import Pedido
from apps.payments.models import Pago
from apps.reviews.models import Resena

logger = logging.getLogger(__name__)

ORDENAMIENTO_USUARIO = (
    "nombre",
    "-nombre",
    "correo",
    "-correo",
    "fecha_registro",
    "-fecha_registro",
    "id",
    "-id",
)

MOTIVO_MIN = 5


def exigir_admin(usuario) -> None:
    if not (usuario and usuario.is_authenticated and usuario.es_administrador):
        raise PermissionDenied("Solo un administrador puede gestionar usuarios.")
    if not usuario.is_active:
        raise PermissionDenied("La cuenta administradora está suspendida.")


def _motivo(motivo: str) -> str:
    motivo = (motivo or "").strip()
    if len(motivo) < MOTIVO_MIN:
        raise ValidationError(
            {"motivo": f"Indica un motivo de al menos {MOTIVO_MIN} caracteres."}
        )
    return motivo[:300]


def _admins_activos(excluir_pk=None) -> int:
    qs = Usuario.objects.filter(rol=Usuario.Rol.ADMINISTRADOR, estado=Usuario.Estado.ACTIVO)
    if excluir_pk is not None:
        qs = qs.exclude(pk=excluir_pk)
    return qs.count()


def _invalidar_sesiones(usuario: Usuario) -> None:
    """Blacklist de todos los refresh tokens vigentes del usuario."""
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for token in OutstandingToken.objects.filter(user=usuario):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception:  # pragma: no cover - no debe romper la decisión de negocio
        logger.exception("No se pudieron invalidar las sesiones de %s", usuario.pk)


def _notificar(usuario: Usuario, titulo: str, mensaje: str) -> None:
    try:
        crear_notificacion(
            usuario=usuario,
            tipo=Notificacion.Tipo.GENERAL,
            titulo=titulo,
            mensaje=mensaje,
        )
    except Exception:  # pragma: no cover - una notificación nunca rompe el negocio
        logger.exception("No se pudo notificar al usuario %s", usuario.pk)


def _auditar(actor, usuario: Usuario, campo: str, anterior, nuevo, motivo: str) -> None:
    registrar(
        usuario=actor,
        accion="actualizar",
        entidad="usuario",
        id_entidad=usuario.pk,
        detalle={
            "campo": campo,
            "de": str(anterior),
            "a": str(nuevo),
            "motivo": motivo,
        },
    )


def pedidos_activos_como_comprador(usuario: Usuario):
    return Pedido.objects.filter(id_comprador=usuario).exclude(
        estado__in=Pedido.ESTADOS_FINALES
    )


def pedidos_activos_en_puestos(usuario: Usuario):
    return Pedido.objects.filter(id_puesto__id_vendedor=usuario).exclude(
        estado__in=Pedido.ESTADOS_FINALES
    )


def cambiar_rol(*, usuario: Usuario, nuevo_rol: str, motivo: str, actor: Usuario) -> Usuario:
    exigir_admin(actor)
    if usuario.pk == actor.pk:
        raise ValidationError({"usuario": "No puedes cambiar tu propio rol."})
    if nuevo_rol not in Usuario.Rol.values:
        raise ValidationError({"rol": f"Rol inválido: {nuevo_rol!r}."})
    if usuario.rol == nuevo_rol:
        raise ValidationError({"rol": "La cuenta ya tiene ese rol."})
    motivo = _motivo(motivo)

    if (
        usuario.rol == Usuario.Rol.ADMINISTRADOR
        and nuevo_rol != Usuario.Rol.ADMINISTRADOR
        and usuario.estado == Usuario.Estado.ACTIVO
        and _admins_activos(excluir_pk=usuario.pk) == 0
    ):
        raise ValidationError({"rol": "No puedes degradar al último administrador activo."})

    if usuario.rol == Usuario.Rol.COMPRADOR and nuevo_rol != Usuario.Rol.COMPRADOR:
        activos = pedidos_activos_como_comprador(usuario).count()
        if activos:
            raise ValidationError(
                {
                    "rol": (
                        f"La cuenta tiene {activos} pedido(s) activo(s) como comprador. "
                        "Resuélvelos antes de cambiar el rol."
                    )
                }
            )

    if usuario.rol == Usuario.Rol.VENDEDOR and nuevo_rol != Usuario.Rol.VENDEDOR:
        activos = pedidos_activos_en_puestos(usuario).count()
        if activos:
            raise ValidationError(
                {
                    "rol": (
                        f"La cuenta tiene {activos} pedido(s) activo(s) en sus puestos. "
                        "Resuélvelos antes de cambiar el rol."
                    )
                }
            )

    anterior = usuario.rol
    with transaction.atomic():
        if nuevo_rol == Usuario.Rol.VENDEDOR:
            Vendedor.objects.get_or_create(id_usuario=usuario)
        if anterior == Usuario.Rol.VENDEDOR:
            Puesto.objects.filter(id_vendedor=usuario, estado=Puesto.Estado.ACTIVO).update(
                estado=Puesto.Estado.INACTIVO
            )
        usuario.rol = nuevo_rol
        usuario.save(update_fields=["rol"])
        _invalidar_sesiones(usuario)

    _notificar(
        usuario,
        "Tu rol cambió",
        f"Un administrador cambió tu rol de {anterior} a {nuevo_rol}. Motivo: {motivo}",
    )
    _auditar(actor, usuario, "rol", anterior, nuevo_rol, motivo)
    return usuario


def suspender(*, usuario: Usuario, motivo: str, actor: Usuario) -> Usuario:
    exigir_admin(actor)
    if usuario.pk == actor.pk:
        raise ValidationError({"usuario": "No puedes suspender tu propia cuenta."})
    if usuario.estado == Usuario.Estado.SUSPENDIDO:
        raise ValidationError({"estado": "La cuenta ya está suspendida."})
    motivo = _motivo(motivo)

    if usuario.rol == Usuario.Rol.ADMINISTRADOR and _admins_activos(excluir_pk=usuario.pk) == 0:
        raise ValidationError({"estado": "No puedes suspender al último administrador activo."})

    with transaction.atomic():
        usuario.estado = Usuario.Estado.SUSPENDIDO
        usuario.save(update_fields=["estado"])
        Puesto.objects.filter(id_vendedor=usuario, estado=Puesto.Estado.ACTIVO).update(
            estado=Puesto.Estado.SUSPENDIDO
        )
        _invalidar_sesiones(usuario)

    _notificar(
        usuario,
        "Cuenta suspendida",
        f"Tu cuenta fue suspendida. Motivo: {motivo}",
    )
    _auditar(actor, usuario, "estado", Usuario.Estado.ACTIVO, Usuario.Estado.SUSPENDIDO, motivo)
    return usuario


def reactivar(*, usuario: Usuario, actor: Usuario) -> Usuario:
    exigir_admin(actor)
    if usuario.estado == Usuario.Estado.ACTIVO:
        raise ValidationError({"estado": "La cuenta ya está activa."})

    with transaction.atomic():
        usuario.estado = Usuario.Estado.ACTIVO
        usuario.save(update_fields=["estado"])

    _notificar(
        usuario,
        "Cuenta reactivada",
        "Tu cuenta fue reactivada. Ya puedes iniciar sesión de nuevo.",
    )
    _auditar(
        actor,
        usuario,
        "estado",
        Usuario.Estado.SUSPENDIDO,
        Usuario.Estado.ACTIVO,
        "Reactivación administrativa",
    )
    return usuario


def filtrar_usuarios(queryset, params):
    rol = params.get("rol")
    if rol:
        if rol not in Usuario.Rol.values:
            raise ValidationError({"rol": f"Rol inválido: {rol!r}."})
        queryset = queryset.filter(rol=rol)
    estado = params.get("estado")
    if estado:
        if estado not in Usuario.Estado.values:
            raise ValidationError({"estado": f"Estado inválido: {estado!r}."})
        queryset = queryset.filter(estado=estado)
    consulta = (params.get("q") or "").strip()
    if consulta:
        queryset = queryset.filter(
            Q(nombre__icontains=consulta)
            | Q(correo__icontains=consulta)
            | Q(celular__icontains=consulta)
        )
    return queryset


def usuarios_con_metricas():
    return (
        Usuario.objects.select_related("vendedor")
        .prefetch_related("puestos")
        .annotate(
            total_pedidos_comprador=Count("pedidos", distinct=True),
            pedidos_activos_count=Count(
                "pedidos",
                filter=~Q(pedidos__estado__in=Pedido.ESTADOS_FINALES),
                distinct=True,
            ),
        )
        .order_by("-fecha_registro", "-id")
    )


def acciones_permitidas(usuario: Usuario, actor: Usuario) -> list[str]:
    if usuario.pk == actor.pk:
        return []
    if usuario.estado == Usuario.Estado.SUSPENDIDO:
        return ["reactivar"]
    if (
        usuario.rol != Usuario.Rol.ADMINISTRADOR
        or _admins_activos(excluir_pk=usuario.pk) > 0
    ):
        return ["cambiar-rol", "suspender"]
    return []


def _dinero(valor) -> str:
    return str((valor or Decimal("0.00")).quantize(Decimal("0.01")))


def resumen() -> dict:
    usuarios = Usuario.objects.aggregate(
        total=Count("id"),
        activos=Count("id", filter=Q(estado=Usuario.Estado.ACTIVO)),
        suspendidos=Count("id", filter=Q(estado=Usuario.Estado.SUSPENDIDO)),
    )
    roles = {rol: Usuario.objects.filter(rol=rol).count() for rol in Usuario.Rol.values}
    pedidos_por_estado = {
        estado: Pedido.objects.filter(estado=estado).count() for estado in Pedido.Estado.values
    }
    puestos_por_estado = {
        estado: Puesto.objects.filter(estado=estado).count() for estado in Puesto.Estado.values
    }
    productos_por_estado = {
        estado: Producto.objects.filter(estado=estado).count()
        for estado in Producto.Estado.values
    }
    pagos = Pago.objects.filter(estado=Pago.Estado.APROBADO).aggregate(
        total=Sum("total_cobrado"),
        comision=Sum("comision_plataforma"),
    )
    return {
        "usuarios": {
            "total": usuarios["total"],
            "activos": usuarios["activos"],
            "suspendidos": usuarios["suspendidos"],
            "por_rol": roles,
        },
        "pedidos": {
            "total": Pedido.objects.count(),
            "por_estado": pedidos_por_estado,
            "activos": Pedido.objects.exclude(estado__in=Pedido.ESTADOS_FINALES).count(),
            "con_no_recibido": Pedido.objects.filter(no_recibido_en__isnull=False).count(),
        },
        "pagos": {
            "total": Pago.objects.count(),
            "por_confirmar": Pago.objects.filter(
                estado__in=(Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
            ).count(),
            "total_vendido": _dinero(pagos["total"]),
            "comision": _dinero(pagos["comision"]),
        },
        "verificaciones_pendientes": Vendedor.objects.filter(
            estado_verificacion=Vendedor.EstadoVerificacion.PENDIENTE
        ).count(),
        "puestos": {
            "total": Puesto.objects.count(),
            "por_estado": puestos_por_estado,
        },
        "productos": {
            "total": Producto.objects.count(),
            "por_estado": productos_por_estado,
            "bloqueados": productos_por_estado[Producto.Estado.BLOQUEADO],
        },
        "resenas": {
            "total": Resena.objects.count(),
            "ocultas": Resena.objects.filter(visible=False).count(),
        },
        "cupones": {
            "total": _contar_cupones(),
            "activos": _contar_cupones(activos=True),
        },
        "generado_en": timezone.now().isoformat(),
    }


def _contar_cupones(activos: bool = False) -> int:
    from apps.promotions.models import Cupon

    qs = Cupon.objects.all()
    if activos:
        qs = qs.filter(activo=True)
    return qs.count()
