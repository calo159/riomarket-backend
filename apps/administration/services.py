"""Reglas de negocio de la administración de usuarios.

Toda decisión sensible (cambio de rol, suspensión, reactivación) vive aquí
para que sea verificable y para que la API no pueda saltársela. Reglas:

- Nadie cambia su propio rol ni sus roles adicionales ni se suspende a sí mismo.
- Solo un administrador base otorga ese rol o modifica/suspende a otro administrador.
- No se puede degradar/suspender al último administrador activo.
- No se cambia el rol base de quien tenga pedidos activos como comprador o en
  sus puestos (las acciones de pedido dependen del rol).
- Al cambiar de rol o suspender se revocan las sesiones vigentes (blacklist).
- Cada decisión deja notificación al afectado y registro de auditoría.
"""

import logging
import secrets
import string
from decimal import Decimal

from django.contrib.auth import password_validation
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, OuterRef, Prefetch, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.accounts.models import Usuario, Vendedor
from apps.accounts.services import crear_cuenta, invalidar_sesiones
from apps.audit.services import registrar
from apps.catalog.models import Producto, Puesto
from apps.common.motivo import validar_motivo
from apps.common.query import parametro_entero
from apps.notifications.models import Notificacion
from apps.notifications.services import crear_notificacion
from apps.orders.models import Pedido
from apps.payments import comisiones
from apps.payments.models import Pago
from apps.promotions.models import Cupon
from apps.rbac.acceso import recursos_de_usuario
from apps.rbac.models import Rol, UsuarioRol
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


def exigir_admin(usuario) -> None:
    """El actor ya pasó TieneRecurso en la vista; aquí solo se exige cuenta activa."""
    if not (usuario and usuario.is_authenticated and usuario.is_active):
        raise PermissionDenied("Tu cuenta no puede gestionar usuarios.")


def _motivo(motivo: str) -> str:
    return validar_motivo(motivo)


def _exigir_alcance(usuario: Usuario, actor: Usuario) -> None:
    """Solo un administrador base toca a otro administrador (anti-escalada)."""
    if usuario.rol == Usuario.Rol.ADMINISTRADOR and not actor.es_administrador:
        raise PermissionDenied("Solo un administrador puede modificar a otro administrador.")


def _admins_activos(excluir_pk=None) -> int:
    qs = Usuario.objects.filter(rol=Usuario.Rol.ADMINISTRADOR, estado=Usuario.Estado.ACTIVO)
    if excluir_pk is not None:
        qs = qs.exclude(pk=excluir_pk)
    return qs.count()


def _invalidar_sesiones(usuario: Usuario) -> None:
    try:
        invalidar_sesiones(usuario)
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
    return Pedido.objects.filter(id_comprador=usuario).exclude(estado__in=Pedido.ESTADOS_FINALES)


def pedidos_activos_en_puestos(usuario: Usuario):
    return Pedido.objects.filter(id_puesto__id_vendedor=usuario).exclude(
        estado__in=Pedido.ESTADOS_FINALES
    )


# Sin 0/O, 1/l/I: la contraseña temporal se lee y se dicta por teléfono sin confusiones.
_LETRAS_TEMPORAL = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"
_DIGITOS_TEMPORAL = "23456789"
LARGO_PASSWORD_TEMPORAL = 12


def generar_password_temporal() -> str:
    """Contraseña aleatoria (``secrets``), legible, con letras y números, válida para Django."""
    alfabeto = _LETRAS_TEMPORAL + _DIGITOS_TEMPORAL
    while True:
        candidata = "".join(secrets.choice(alfabeto) for _ in range(LARGO_PASSWORD_TEMPORAL))
        tiene_letra = any(c in string.ascii_letters for c in candidata)
        tiene_digito = any(c in _DIGITOS_TEMPORAL for c in candidata)
        if not (tiene_letra and tiene_digito):
            continue
        try:
            password_validation.validate_password(candidata)
        except ValidationError:  # pragma: no cover - 12 al azar casi nunca caen en una lista común
            continue
        return candidata


def crear_usuario(
    *, actor: Usuario, nombre: str, correo: str, celular: str, rol: str
) -> tuple[Usuario, str]:
    """El administrador crea una cuenta; devuelve ``(usuario, contraseña_temporal)``.

    La contraseña la genera el sistema y se muestra una sola vez (no se guarda en claro ni en la
    auditoría); la persona la cambia al entrar desde «Mi perfil». Un vendedor nace pendiente de
    verificación, igual que al registrarse. Solo un administrador base crea administradores.
    """
    exigir_admin(actor)
    if rol not in Usuario.Rol.values:
        raise ValidationError({"rol": f"Rol inválido: {rol!r}."})
    if rol == Usuario.Rol.ADMINISTRADOR and not actor.es_administrador:
        raise PermissionDenied("Solo un administrador puede crear a otro administrador.")

    password = generar_password_temporal()
    usuario = crear_cuenta(
        nombre=nombre, correo=correo, celular=celular, rol=rol, password=password
    )
    registrar(
        usuario=actor,
        accion="crear",
        entidad="usuario",
        id_entidad=usuario.pk,
        detalle={"rol": rol, "origen": "administrador"},
    )
    return usuario, password


def _exigir_gestion_de_cuenta(usuario: Usuario, actor: Usuario, accion: str) -> None:
    exigir_admin(actor)
    if usuario.pk == actor.pk:
        raise ValidationError({"usuario": f"{accion} tu propia cuenta desde «Mi perfil»."})
    _exigir_alcance(usuario, actor)


def editar_datos(
    *, usuario: Usuario, actor: Usuario, nombre: str, correo: str, celular: str, motivo: str
) -> Usuario:
    """El administrador corrige nombre, correo o celular de una cuenta (queda auditado)."""
    _exigir_gestion_de_cuenta(usuario, actor, "Edita")
    motivo = _motivo(motivo)
    nuevos = {
        "nombre": nombre.strip(),
        "correo": Usuario.normalizar_correo(correo),
        "celular": Usuario.normalizar_celular(celular),
    }
    cambios = {c: v for c, v in nuevos.items() if getattr(usuario, c) != v}
    if not cambios:
        raise ValidationError({"datos": "No cambiaste ningún dato."})
    if "correo" in cambios and Usuario.objects.filter(correo=cambios["correo"]).exists():
        raise ValidationError({"correo": "Ya existe una cuenta con ese correo."})
    if "celular" in cambios and Usuario.objects.filter(celular=cambios["celular"]).exists():
        raise ValidationError({"celular": "Ya existe una cuenta con ese celular."})

    anterior = {c: getattr(usuario, c) for c in cambios}
    try:
        with transaction.atomic():
            for campo, valor in cambios.items():
                setattr(usuario, campo, valor)
            usuario.save(update_fields=list(cambios))
    except IntegrityError as exc:  # carrera con otro registro del mismo correo o celular
        raise ValidationError({"correo": "Ya existe una cuenta con ese correo o celular."}) from exc

    for campo, valor in cambios.items():
        _auditar(actor, usuario, campo, anterior[campo], valor, motivo)
    _notificar(
        usuario,
        "Actualizaron los datos de tu cuenta",
        f"Un administrador cambió: {', '.join(cambios)}. Motivo: {motivo}",
    )
    return usuario


def restablecer_contrasena(*, usuario: Usuario, actor: Usuario, motivo: str) -> tuple[Usuario, str]:
    """Pone una contraseña temporal nueva (se muestra una sola vez) y cierra las sesiones.

    Es lo que hace falta cuando alguien olvidó la suya y aún no hay correo para recuperarla.
    """
    _exigir_gestion_de_cuenta(usuario, actor, "Cambia")
    motivo = _motivo(motivo)
    password = generar_password_temporal()
    with transaction.atomic():
        usuario.set_password(password)
        usuario.save(update_fields=["password"])
        _invalidar_sesiones(usuario)
    _notificar(
        usuario,
        "Restablecieron tu contraseña",
        f"Un administrador restableció tu contraseña. Motivo: {motivo}",
    )
    # La contraseña nunca va a la auditoría: solo que se restableció.
    _auditar(actor, usuario, "contraseña", "", "restablecida", motivo)
    return usuario, password


def cambiar_rol(*, usuario: Usuario, nuevo_rol: str, motivo: str, actor: Usuario) -> Usuario:
    exigir_admin(actor)
    if usuario.pk == actor.pk:
        raise ValidationError({"usuario": "No puedes cambiar tu propio rol."})
    if nuevo_rol not in Usuario.Rol.values:
        raise ValidationError({"rol": f"Rol inválido: {nuevo_rol!r}."})
    if usuario.rol == nuevo_rol:
        raise ValidationError({"rol": "La cuenta ya tiene ese rol."})
    motivo = _motivo(motivo)
    _exigir_alcance(usuario, actor)
    if nuevo_rol == Usuario.Rol.ADMINISTRADOR and not actor.es_administrador:
        raise PermissionDenied("Solo un administrador puede otorgar el rol de administrador.")

    if (
        usuario.rol == Usuario.Rol.ADMINISTRADOR
        and nuevo_rol != Usuario.Rol.ADMINISTRADOR
        and usuario.estado == Usuario.Estado.ACTIVO
        and _admins_activos(excluir_pk=usuario.pk) == 0
    ):
        raise ValidationError({"rol": "No puedes degradar al último administrador activo."})

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
    _exigir_alcance(usuario, actor)

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
    _exigir_alcance(usuario, actor)

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
    rol_asignado = parametro_entero(params, "rol_asignado")
    if rol_asignado is not None:
        queryset = queryset.filter(asignaciones_rol__id_rol_id=rol_asignado)
    consulta = (params.get("q") or "").strip()
    if consulta:
        queryset = queryset.filter(
            Q(nombre__icontains=consulta)
            | Q(correo__icontains=consulta)
            | Q(celular__icontains=consulta)
        )
    return queryset


def _contar_pedidos_del_usuario(activos: bool = False):
    pedidos = Pedido.objects.filter(id_comprador=OuterRef("pk"))
    if activos:
        pedidos = pedidos.exclude(estado__in=Pedido.ESTADOS_FINALES)
    cuenta = pedidos.order_by().values("id_comprador").annotate(total=Count("pk")).values("total")
    return Coalesce(Subquery(cuenta), 0)


def usuarios_con_metricas():
    return (
        Usuario.objects.select_related("vendedor")
        .prefetch_related(
            "puestos",
            Prefetch(
                "asignaciones_rol",
                queryset=UsuarioRol.objects.select_related("id_rol").order_by("id_rol__nombre"),
            ),
        )
        .annotate(
            # Subconsultas: el COUNT de la paginación no hace join con todos los pedidos.
            total_pedidos_comprador=_contar_pedidos_del_usuario(),
            pedidos_activos_count=_contar_pedidos_del_usuario(activos=True),
        )
        .order_by("-fecha_registro", "-id")
    )


def asignar_roles_adicionales(
    *, usuario: Usuario, roles_ids: list[int], motivo: str, actor: Usuario
) -> Usuario:
    """Reemplaza los roles personalizados del usuario; el rol base no se toca."""
    exigir_admin(actor)
    if usuario.pk == actor.pk:
        raise ValidationError({"usuario": "No puedes cambiar tus propios roles."})
    _exigir_alcance(usuario, actor)
    motivo = _motivo(motivo)

    ids = set(roles_ids)
    roles = list(Rol.objects.filter(pk__in=ids, es_sistema=False))
    if len(roles) != len(ids):
        raise ValidationError(
            {"roles": "Solo se asignan roles personalizados que existan (no los roles base)."}
        )

    with transaction.atomic():
        actuales = {
            a.id_rol_id: a.id_rol.nombre
            for a in UsuarioRol.objects.filter(
                id_usuario=usuario, id_rol__es_sistema=False
            ).select_related("id_rol")
        }
        UsuarioRol.objects.filter(id_usuario=usuario, id_rol__es_sistema=False).exclude(
            id_rol__in=ids
        ).delete()
        UsuarioRol.objects.bulk_create(
            [UsuarioRol(id_usuario=usuario, id_rol=r) for r in roles if r.pk not in actuales]
        )

    anteriores = sorted(actuales.values())
    nuevos = sorted(r.nombre for r in roles)
    if anteriores != nuevos:
        _notificar(
            usuario,
            "Tus accesos cambiaron",
            f"Un administrador actualizó tus roles adicionales. Motivo: {motivo}",
        )
        _auditar(
            actor, usuario, "roles_adicionales", ", ".join(anteriores), ", ".join(nuevos), motivo
        )
    return usuario


def acciones_permitidas(
    usuario: Usuario,
    actor: Usuario,
    recursos: set[str] | None = None,
    total_admins: int | None = None,
) -> list[str]:
    """Acciones que ``actor`` puede ejecutar sobre ``usuario`` (para ocultar botones)."""
    if usuario.pk == actor.pk:
        return []
    if usuario.rol == Usuario.Rol.ADMINISTRADOR and not actor.es_administrador:
        return []
    if recursos is None:
        recursos = recursos_de_usuario(actor)
    if usuario.estado == Usuario.Estado.SUSPENDIDO:
        return ["reactivar"]
    if total_admins is None:
        total_admins = _admins_activos()
    es_ultimo_admin = usuario.rol == Usuario.Rol.ADMINISTRADOR and total_admins <= 1
    acciones = ["editar-datos", "restablecer-contrasena"]
    if "admin.roles" in recursos:
        if not es_ultimo_admin:
            acciones.append("cambiar-rol")
        acciones.append("roles")
    if not es_ultimo_admin:
        acciones.append("suspender")
    return acciones


def _dinero(valor) -> str:
    return str((valor or Decimal("0.00")).quantize(Decimal("0.01")))


def _conteos(modelo, campo: str, valores) -> dict[str, int]:
    """Cuenta por valor con una sola consulta; los valores sin filas valen 0."""
    cuentas = dict.fromkeys(valores, 0)
    for fila in modelo.objects.values(campo).annotate(n=Count("id")):
        cuentas[fila[campo]] = fila["n"]
    return cuentas


def _conteos_por_valor(campo: str, valores, prefijo: str) -> dict:
    """Expresiones de ``aggregate`` que cuentan cada valor del campo en una sola consulta."""
    return {f"{prefijo}_{valor}": Count("id", filter=Q(**{campo: valor})) for valor in valores}


def _extraer_conteos(fila: dict, valores, prefijo: str) -> dict[str, int]:
    return {valor: fila[f"{prefijo}_{valor}"] for valor in valores}


def resumen() -> dict:
    # Una consulta por tabla (agregaciones condicionales) en lugar de una por cifra.
    usuarios = Usuario.objects.aggregate(
        total=Count("id"),
        activos=Count("id", filter=Q(estado=Usuario.Estado.ACTIVO)),
        suspendidos=Count("id", filter=Q(estado=Usuario.Estado.SUSPENDIDO)),
        **_conteos_por_valor("rol", Usuario.Rol.values, "rol"),
    )
    roles = _extraer_conteos(usuarios, Usuario.Rol.values, "rol")
    pedidos = Pedido.objects.aggregate(
        con_no_recibido=Count("id", filter=Q(no_recibido_en__isnull=False)),
        **_conteos_por_valor("estado", Pedido.Estado.values, "estado"),
    )
    pedidos_por_estado = _extraer_conteos(pedidos, Pedido.Estado.values, "estado")
    puestos_por_estado = _conteos(Puesto, "estado", Puesto.Estado.values)
    productos_por_estado = _conteos(Producto, "estado", Producto.Estado.values)
    pagos = Pago.objects.aggregate(
        total=Count("id"),
        por_confirmar=Count(
            "id", filter=Q(estado__in=(Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO))
        ),
        vendido=Sum("total_cobrado", filter=Q(estado=Pago.Estado.APROBADO)),
        comision=Sum("comision_plataforma", filter=Q(estado=Pago.Estado.APROBADO)),
    )
    resenas = Resena.objects.aggregate(
        total=Count("id"), ocultas=Count("id", filter=Q(visible=False))
    )
    cupones = _contar_cupones()
    return {
        "usuarios": {
            "total": usuarios["total"],
            "activos": usuarios["activos"],
            "suspendidos": usuarios["suspendidos"],
            "por_rol": roles,
        },
        "pedidos": {
            "total": sum(pedidos_por_estado.values()),
            "por_estado": pedidos_por_estado,
            "activos": sum(
                n for e, n in pedidos_por_estado.items() if e not in Pedido.ESTADOS_FINALES
            ),
            "con_no_recibido": pedidos["con_no_recibido"],
        },
        "pagos": {
            "total": pagos["total"],
            "por_confirmar": pagos["por_confirmar"],
            "total_vendido": _dinero(pagos["vendido"]),
            "comision": _dinero(pagos["comision"]),
        },
        "verificaciones_pendientes": Vendedor.objects.filter(
            estado_verificacion=Vendedor.EstadoVerificacion.PENDIENTE
        ).count(),
        "puestos": {
            "total": sum(puestos_por_estado.values()),
            "por_estado": puestos_por_estado,
        },
        "productos": {
            "total": sum(productos_por_estado.values()),
            "por_estado": productos_por_estado,
            "bloqueados": productos_por_estado[Producto.Estado.BLOQUEADO],
        },
        "resenas": resenas,
        "cupones": cupones,
        "comisiones": comisiones.cuentas_por_estado(),
        "generado_en": timezone.now().isoformat(),
    }


def _contar_cupones() -> dict:

    return Cupon.objects.aggregate(total=Count("id"), activos=Count("id", filter=Q(activo=True)))
