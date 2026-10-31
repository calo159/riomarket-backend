"""Apartar con plazo: cancelar solo lo que nadie confirmó o recogió a tiempo (ADR-012).

Un retiro aparta el producto (el stock se descuenta al crear el pedido). Si el puesto no lo
confirma o el cliente no lo recoge, este módulo lo cancela y el stock vuelve. Cancela pedidos
SIN intervención humana, así que cada decisión se revalida bajo bloqueo de fila:

- ``cancelar_vencidos`` lista candidatos con UNA consulta y procesa cada uno en su propia
  transacción. Bloquea el pedido con ``skip_locked`` (si «Entregar y cobrar» lo tiene, se
  salta) y vuelve a comprobar plazo, estado y pago antes de tocar nada.
- Es idempotente: un pedido ya cancelado, entregado o con el pago aprobado no cumple la
  regla, de modo que repetir el barrido (o correrlo en dos procesos) no repone nada dos veces.
- Orden de bloqueos en todo el sistema: pedido -> pago.
- Un fallo en un pedido se registra y no detiene al resto.

Render gratis no tiene cron: ``barrer_si_toca`` corre de forma perezosa (como mucho una vez
por minuto) cuando alguien lee el catálogo o los pedidos; el comando
``cancelar_pedidos_vencidos`` lo corre al arrancar el servicio.
"""

import logging
from dataclasses import dataclass, field
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.orders import permissions, services
from apps.orders.models import Pedido

logger = logging.getLogger(__name__)

CLAVE_CANDADO = "orders:barrido_vencidos"
ESTADOS_CON_PLAZO = (Pedido.Estado.PENDIENTE, Pedido.Estado.LISTO_PARA_RECOGER)


@dataclass(frozen=True)
class ResultadoBarrido:
    revisados: int = 0
    cancelados: list[int] = field(default_factory=list)
    avisados: list[int] = field(default_factory=list)
    omitidos: int = 0


# ---------------------------------------------------------------------------
# Candidatos (una sola consulta)
# ---------------------------------------------------------------------------
def _buscar_candidatos(*, ahora, limite, vencidos=True, por_vencer=True):
    """Ids de pedidos vencidos y de pedidos por vencer sin aviso, en UNA consulta.

    Primero los que llevan más tiempo vencidos. ``limite`` acota el total de filas.
    """
    condicion = Q()
    if vencidos:
        condicion |= Q(vence_en__lte=ahora)
    if por_vencer:
        hasta = ahora + timedelta(hours=settings.PEDIDOS_AVISO_ANTES_HORAS)
        condicion |= Q(vence_en__gt=ahora, vence_en__lte=hasta, aviso_vencimiento_en__isnull=True)
    consulta = (
        Pedido.objects.filter(
            condicion,
            tipo_entrega=Pedido.TipoEntrega.RETIRO,
            estado__in=ESTADOS_CON_PLAZO,
        )
        .order_by("vence_en", "pk")
        .values_list("pk", "vence_en")
    )
    if limite is not None:
        consulta = consulta[:limite]
    filas = list(consulta)
    return (
        [pk for pk, vence in filas if vence <= ahora],
        [pk for pk, vence in filas if vence > ahora],
    )


# ---------------------------------------------------------------------------
# Cancelar
# ---------------------------------------------------------------------------
def _bloquear_pedido(pk: int):
    """Bloquea el pedido o devuelve ``None`` si otra transacción ya lo tiene bloqueado.

    ``skip_locked`` (PostgreSQL): si «Entregar y cobrar» o un pago lo tienen, no se espera
    ni se pisa; el siguiente barrido lo revisa. SQLite ignora los bloqueos (sin
    concurrencia real), por eso las pruebas lo simulan y una prueba de PostgreSQL lo ejerce.
    """
    return Pedido.objects.select_for_update(skip_locked=True).filter(pk=pk).first()


def _motivo_de_vencimiento(pedido: Pedido, pago) -> str | None:
    """Regla de ADR-012: ¿hay que cancelar este pedido? Devuelve el motivo o ``None``."""
    from apps.payments.models import Pago

    if pedido.tipo_entrega != Pedido.TipoEntrega.RETIRO:
        return None
    if pedido.estado == Pedido.Estado.PENDIENTE:
        if pago is None or pago.estado != Pago.Estado.APROBADO:
            return Pedido.MotivoCancelacion.NO_CONFIRMADO
        return None
    if (
        pedido.estado == Pedido.Estado.LISTO_PARA_RECOGER
        and pago is not None
        and pago.metodo_pago == Pago.MetodoPago.EFECTIVO
        and pago.estado in (Pago.Estado.PENDIENTE, Pago.Estado.PROCESANDO)
    ):
        return Pedido.MotivoCancelacion.NO_RECOGIDO
    return None


_OMITIDO = "omitido"
_SIN_CAMBIOS = "sin_cambios"
_CANCELADO = "cancelado"


def _procesar_vencido(pk: int, ahora):
    """Revalida y, si corresponde, cancela UN pedido en su propia transacción."""
    from apps.payments.models import Pago

    with transaction.atomic():
        pedido = _bloquear_pedido(pk)
        if pedido is None:
            return _OMITIDO, None
        # Entre la lista y el bloqueo pudo cambiar todo: se vuelve a mirar bajo bloqueo.
        if pedido.vence_en is None or pedido.vence_en > ahora:
            return _SIN_CAMBIOS, None  # plazo ya limpiado o ampliado
        pago = Pago.objects.select_for_update().filter(id_pedido=pedido).first()
        motivo = _motivo_de_vencimiento(pedido, pago)
        if motivo is None:
            # Ya no aplica (se pagó, cambió de estado...): se quita el plazo y no se cancela.
            Pedido.objects.filter(pk=pedido.pk).update(vence_en=None, aviso_vencimiento_en=None)
            return _SIN_CAMBIOS, None
        vencio_en = pedido.vence_en
        estado_anterior = services._aplicar_transicion(
            pedido=pedido,
            destino=Pedido.Estado.CANCELADO,
            usuario=None,
            motivo_cancelacion=motivo,
        )
        return _CANCELADO, (pedido, estado_anterior, vencio_en, motivo)


def _despues_de_cancelar(pedido, estado_anterior, vencio_en, motivo, origen):
    """Avisos y auditoría, fuera de la transacción del pedido (nunca la deshacen)."""
    from apps.audit import services as audit
    from apps.notifications import services as notif

    try:
        notif.notificar_pedido_vencido(pedido=pedido, vencio_en=vencio_en, motivo=motivo)
    except Exception:
        logger.exception("No se pudo notificar el vencimiento del pedido %s", pedido.pk)
    audit.registrar(
        usuario=None,  # el sistema
        accion="vencimiento",
        entidad="pedido",
        id_entidad=pedido.pk,
        detalle={
            "de": estado_anterior,
            "a": Pedido.Estado.CANCELADO,
            "motivo": motivo,
            "vence_en": vencio_en.isoformat(),
            "origen": origen,
        },
    )


def _cancelar_ids(ids, ahora, origen):
    cancelados: list[int] = []
    omitidos = 0
    for pk in ids:
        try:
            resultado, datos = _procesar_vencido(pk, ahora)
        except Exception:
            # Un pedido con problemas no detiene al resto; su transacción ya se deshizo.
            logger.exception("No se pudo cancelar por plazo el pedido %s", pk)
            continue
        if resultado == _OMITIDO:
            omitidos += 1
        elif resultado == _CANCELADO:
            cancelados.append(pk)
            _despues_de_cancelar(*datos, origen)
    return cancelados, omitidos


def cancelar_vencidos(*, ahora=None, limite: int | None = None, origen="lectura"):
    """Cancela los retiros cuyo plazo venció y que siguen sin confirmar o sin recoger."""
    ahora = ahora or timezone.now()
    vencidos, _ = _buscar_candidatos(ahora=ahora, limite=limite, por_vencer=False)
    cancelados, omitidos = _cancelar_ids(vencidos, ahora, origen)
    return ResultadoBarrido(revisados=len(vencidos), cancelados=cancelados, omitidos=omitidos)


# ---------------------------------------------------------------------------
# Avisar
# ---------------------------------------------------------------------------
def _avisar_ids(ids, ahora) -> list[int]:
    from apps.notifications import services as notif

    avisados: list[int] = []
    for pk in ids:
        try:
            # El UPDATE condicional hace de candado: si otro proceso ya avisó, devuelve 0.
            marcados = Pedido.objects.filter(
                pk=pk,
                aviso_vencimiento_en__isnull=True,
                vence_en__gt=ahora,
                tipo_entrega=Pedido.TipoEntrega.RETIRO,
                estado__in=ESTADOS_CON_PLAZO,
            ).update(aviso_vencimiento_en=ahora)
            if not marcados:
                continue
            pedido = Pedido.objects.select_related("id_puesto__id_vendedor", "id_comprador").get(
                pk=pk
            )
            notif.notificar_pedido_por_vencer(pedido=pedido)
            avisados.append(pk)
        except Exception:
            logger.exception("No se pudo avisar que el pedido %s está por vencer", pk)
    return avisados


def avisar_por_vencer(*, ahora=None, limite: int | None = None) -> int:
    """Avisa (una sola vez) a quien corresponda que el plazo se acaba pronto."""
    ahora = ahora or timezone.now()
    _, por_vencer = _buscar_candidatos(ahora=ahora, limite=limite, vencidos=False)
    return len(_avisar_ids(por_vencer, ahora))


# ---------------------------------------------------------------------------
# Barrido completo, perezoso y por comando
# ---------------------------------------------------------------------------
def barrer(*, ahora=None, limite: int | None = None, origen="lectura") -> ResultadoBarrido:
    """Avisa lo que está por vencer y cancela lo vencido. Con nada pendiente cuesta 1 consulta."""
    ahora = ahora or timezone.now()
    vencidos, por_vencer = _buscar_candidatos(ahora=ahora, limite=limite)
    cancelados, omitidos = _cancelar_ids(vencidos, ahora, origen)
    avisados = _avisar_ids(por_vencer, ahora)
    return ResultadoBarrido(
        revisados=len(vencidos) + len(por_vencer),
        cancelados=cancelados,
        avisados=avisados,
        omitidos=omitidos,
    )


def barrer_si_toca() -> ResultadoBarrido | None:
    """Barrido perezoso: como mucho una vez por minuto por proceso (candado de caché).

    ``cache.add`` es atómico en LocMem (por proceso) y en Redis (compartido). Sin Redis y con
    dos workers el barrido corre hasta dos veces por minuto: correcto, es idempotente.
    Nunca lanza: leer el catálogo no puede fallar por culpa del barrido.
    """
    if not settings.PEDIDOS_LIBERAR_EN_LECTURA:
        return None
    try:
        if not cache.add(CLAVE_CANDADO, "1", timeout=settings.PEDIDOS_BARRIDO_CADA_SEGUNDOS):
            return None
        return barrer(limite=settings.PEDIDOS_BARRIDO_LIMITE)
    except Exception:
        logger.exception("Falló el barrido de pedidos vencidos")
        return None


# ---------------------------------------------------------------------------
# Dar más tiempo
# ---------------------------------------------------------------------------
def extender_plazo(*, pedido: Pedido, usuario, ahora=None) -> Pedido:
    """El vendedor del puesto (o un administrador) da un plazo completo más, hasta 2 veces."""
    permissions.exigir(
        usuario,
        permissions.Accion.EXTENDER_PLAZO,
        pedido,
        mensaje="Solo el vendedor del puesto o un administrador pueden dar más tiempo.",
    )
    ahora = ahora or timezone.now()
    from django.core.exceptions import ValidationError

    with transaction.atomic():
        bloqueado = Pedido.objects.select_for_update().get(pk=pedido.pk)
        if bloqueado.estado not in ESTADOS_CON_PLAZO:
            raise ValidationError(
                {"estado": "Solo se da más tiempo a pedidos pendientes o listos para recoger."}
            )
        if bloqueado.tipo_entrega != Pedido.TipoEntrega.RETIRO or bloqueado.vence_en is None:
            raise ValidationError({"vence_en": "Este pedido no tiene plazo."})
        if bloqueado.extensiones_plazo >= Pedido.MAX_EXTENSIONES_PLAZO:
            raise ValidationError(
                {"extensiones_plazo": "Ya diste más tiempo dos veces a este pedido."}
            )
        horas = services.horas_de_extension(bloqueado)
        bloqueado.vence_en = max(ahora, bloqueado.vence_en) + timedelta(hours=horas)
        bloqueado.extensiones_plazo += 1
        bloqueado.aviso_vencimiento_en = None
        bloqueado.save(
            update_fields=[
                "vence_en",
                "extensiones_plazo",
                "aviso_vencimiento_en",
                "fecha_actualizacion",
            ]
        )
    _despues_de_extender(bloqueado, usuario)
    return bloqueado


def _despues_de_extender(pedido: Pedido, usuario) -> None:
    from apps.audit import services as audit
    from apps.notifications import services as notif

    try:
        notif.notificar_plazo_extendido(pedido=pedido)
    except Exception:
        logger.exception("No se pudo avisar que el pedido %s tiene más tiempo", pedido.pk)
    audit.registrar(
        usuario=usuario,
        accion="extender_plazo",
        entidad="pedido",
        id_entidad=pedido.pk,
        detalle={"vence_en": pedido.vence_en.isoformat(), "extensiones": pedido.extensiones_plazo},
    )
