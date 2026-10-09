"""Reglas de negocio de promociones/cupones.

- Crear/editar: vendedor del puesto (cupones de su puesto) o administrador
  (cualquiera, incluidos los globales).
- Aplicar: valida vigencia, puesto, monto mínimo y límites de uso; el
  descuento nunca supera el subtotal ni el tope configurado.
- ``Pedido`` guarda el snapshot; ``crear_pedido`` llama a ``aplicar_cupon``
  (bloquea la fila del cupón) y luego ``registrar_uso``.
"""

from decimal import ROUND_DOWN, Decimal

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from apps.accounts.models import Usuario
from apps.promotions.models import Cupon, UsoCupon

ORDENAMIENTO_CUPON = ("fecha_creacion", "-fecha_creacion", "codigo", "-codigo", "id", "-id")

_CAMPOS_EDITABLES = (
    "id_puesto",
    "tipo_descuento",
    "valor",
    "monto_minimo_pedido",
    "tope_descuento",
    "usos_totales",
    "usos_por_usuario",
    "fecha_inicio",
    "fecha_fin",
    "activo",
)


def _auditar(usuario, accion: str, cupon: Cupon, detalle: dict | None = None) -> None:
    """Registra la acción en la auditoría (best-effort)."""
    from apps.audit import services as audit

    audit.registrar(
        usuario=usuario,
        accion=accion,
        entidad="cupon",
        id_entidad=cupon.pk,
        detalle=detalle or {},
    )


def _exigir_gestor(usuario) -> None:
    if not (
        usuario
        and usuario.is_active
        and (usuario.es_administrador or usuario.rol == Usuario.Rol.VENDEDOR)
    ):
        raise PermissionDenied("Solo vendedores y administradores gestionan cupones.")


def _exigir_dueno(cupon: Cupon, usuario) -> None:
    if usuario.es_administrador:
        return
    if cupon.id_puesto_id is None or cupon.id_puesto.id_vendedor_id != usuario.pk:
        raise PermissionDenied("Solo el dueño del puesto (o el admin) gestiona ese cupón.")


def _validar_alcance(usuario, id_puesto) -> None:
    if usuario.es_administrador:
        return
    if id_puesto is None:
        raise ValidationError({"id_puesto": "Solo el administrador crea cupones globales."})
    if id_puesto.id_vendedor_id != usuario.pk:
        raise ValidationError({"id_puesto": "Solo puedes crear cupones para tus puestos."})


def eliminar_cupon(*, cupon: Cupon, usuario) -> None:
    _exigir_gestor(usuario)
    _exigir_dueno(cupon, usuario)
    _auditar(usuario, "eliminar", cupon, {"codigo": cupon.codigo})
    cupon.delete()


def crear_cupon(*, usuario, datos: dict) -> Cupon:
    _exigir_gestor(usuario)
    _validar_alcance(usuario, datos.get("id_puesto"))
    cupon = Cupon(**datos)
    cupon.full_clean()  # valida unique (código) y restricciones
    cupon.save()
    _auditar(usuario, "crear", cupon, {"codigo": cupon.codigo})
    return cupon


def actualizar_cupon(*, cupon: Cupon, usuario, datos: dict) -> Cupon:
    _exigir_gestor(usuario)
    _exigir_dueno(cupon, usuario)
    for campo in _CAMPOS_EDITABLES:
        if campo in datos and campo != "id_puesto":
            setattr(cupon, campo, datos[campo])
    cupon.full_clean()
    cupon.save()
    _auditar(usuario, "actualizar", cupon, {"codigo": cupon.codigo})
    return cupon


def visibles_cupones(usuario, qs: QuerySet[Cupon]) -> QuerySet[Cupon]:
    if not usuario or not usuario.is_authenticated:
        return qs.none()
    if usuario.es_administrador:
        return qs
    if usuario.rol == Usuario.Rol.VENDEDOR:
        return qs.filter(id_puesto__id_vendedor=usuario)
    return qs.none()


def filtrar_cupones(qs: QuerySet[Cupon], params) -> QuerySet[Cupon]:
    activo = params.get("activo")
    if activo in ("true", "false"):
        qs = qs.filter(activo=activo == "true")
    puesto = params.get("puesto")
    if puesto:
        if not puesto.isdigit():
            raise ValidationError({"puesto": "Debe ser un ID entero."})
        qs = qs.filter(id_puesto_id=int(puesto))
    tipo = params.get("tipo")
    if tipo and tipo in Cupon.TipoDescuento.values:
        qs = qs.filter(tipo_descuento=tipo)
    return qs


def _descuento_de(cupon: Cupon, subtotal: Decimal) -> Decimal:
    """Calcula el descuento (tope incluido) sin superar el subtotal."""
    if cupon.tipo_descuento == Cupon.TipoDescuento.MONTO:
        bruto = cupon.valor
    else:
        bruto = (subtotal * cupon.valor / Decimal("100")).quantize(Decimal("0.01"), ROUND_DOWN)
    if cupon.tope_descuento is not None:
        bruto = min(bruto, cupon.tope_descuento)
    return min(bruto, subtotal).quantize(Decimal("0.01"), ROUND_DOWN)


def _exigir_cupon_aplicable(cupon: Cupon, *, usuario, puesto, subtotal: Decimal) -> Decimal:
    errores: dict[str, str] = {}
    ahora = timezone.now()
    if not cupon.activo:
        errores["codigo"] = "El cupón no está activo."
    if cupon.fecha_inicio and ahora < cupon.fecha_inicio:
        errores["codigo"] = "El cupón aún no está vigente."
    if cupon.fecha_fin and ahora > cupon.fecha_fin:
        errores["codigo"] = "El cupón expiró."
    if cupon.id_puesto_id and cupon.id_puesto_id != puesto.pk:
        errores["codigo"] = "El cupón no aplica a ese puesto."
    if cupon.monto_minimo_pedido and subtotal < cupon.monto_minimo_pedido:
        errores["codigo"] = (
            f"El pedido debe sumar al menos {cupon.monto_minimo_pedido} para usar el cupón."
        )
    if cupon.usos_totales and cupon.usos.count() >= cupon.usos_totales:
        errores["codigo"] = "El cupón alcanzó su límite de usos."
    if cupon.usos_por_usuario:
        usos_usuario = cupon.usos.filter(id_usuario=usuario).count()
        if usos_usuario >= cupon.usos_por_usuario:
            errores["codigo"] = "Ya usaste este cupón en otros pedidos."
    if errores:
        raise ValidationError(errores)
    return _descuento_de(cupon, subtotal)


def aplicar_cupon(*, usuario, codigo: str, puesto, subtotal: Decimal):
    """Valida el cupón y devuelve ``(cupon, descuento)`` con la fila bloqueada."""
    codigo = (codigo or "").strip().upper()
    try:
        cupon = Cupon.objects.select_for_update().get(codigo=codigo)
    except Cupon.DoesNotExist as exc:
        raise ValidationError({"codigo": "El cupón no existe."}) from exc
    with transaction.atomic():
        descuento = _exigir_cupon_aplicable(
            cupon, usuario=usuario, puesto=puesto, subtotal=subtotal
        )
    return cupon, descuento


def validar_cupon(*, usuario, codigo: str, puesto, subtotal: Decimal) -> dict:
    """Para el checkout: responde el descuento sin registrar uso."""
    cupon, descuento = aplicar_cupon(
        usuario=usuario, codigo=codigo, puesto=puesto, subtotal=subtotal
    )
    return {
        "codigo": cupon.codigo,
        "tipo_descuento": cupon.tipo_descuento,
        "valor": cupon.valor,
        "descuento": descuento,
    }


def registrar_uso(*, cupon: Cupon, usuario, pedido, descuento: Decimal) -> UsoCupon:
    uso = UsoCupon.objects.create(
        id_cupon=cupon, id_usuario=usuario, id_pedido=pedido, descuento_aplicado=descuento
    )
    _auditar(
        usuario,
        "usar_cupon",
        cupon,
        {"pedido": pedido.pk, "descuento": str(descuento)},
    )
    return uso
