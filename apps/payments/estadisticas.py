"""Panel de ventas (ADR-014): lectura agregada de los pagos aprobados.

Reglas (la definición completa está en ``docs/ADR-014-panel-de-ventas.md``):
- Una venta es un ``Pago`` aprobado; su día es ``fecha_aprobacion`` en hora de Colombia.
- El ingreso neto usa ``services.expresion_neto_vendedor`` (la misma de ``resumen_ingresos``).
- Número fijo de consultas: 4 sin filtro de puesto y 5 con él (el ``get`` del puesto).
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import Count, DecimalField, F, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.http import Http404
from django.utils import timezone

from apps.accounts.models import Usuario
from apps.catalog.models import Puesto
from apps.orders.models import ItemPedido, Pedido
from apps.payments import services
from apps.payments.models import Pago

ZONA = ZoneInfo("America/Bogota")
DIAS_PERMITIDOS = (7, 30, 90)
DIAS_POR_DEFECTO = 30
MAXIMO_TOP = 5
CERO = Decimal("0.00")
_DINERO = DecimalField(max_digits=14, decimal_places=2)


def _texto(valor) -> str:
    return str((valor or CERO).quantize(Decimal("0.01")))


def autorizar(usuario: Usuario) -> None:
    """Solo vendedores y administradores activos ven las ventas."""
    if not (usuario and usuario.is_active and (usuario.es_administrador or usuario.es_vendedor)):
        raise PermissionDenied("Solo vendedores y administradores ven las ventas.")


def validar_dias(valor) -> int:
    if valor in (None, ""):
        return DIAS_POR_DEFECTO
    try:
        dias = int(valor)
    except (TypeError, ValueError):
        dias = 0
    if dias not in DIAS_PERMITIDOS:
        raise ValidationError({"dias": "Usa 7, 30 o 90."})
    return dias


def _puesto_visible(usuario: Usuario, puesto_id: int) -> Puesto:
    try:
        puesto = Puesto.objects.only("id", "nombre", "id_vendedor_id").get(pk=puesto_id)
    except Puesto.DoesNotExist as exc:
        raise Http404("Ese puesto no existe.") from exc
    if not usuario.es_administrador and puesto.id_vendedor_id != usuario.pk:
        raise PermissionDenied("Ese puesto no es tuyo.")
    return puesto


def ventas(usuario: Usuario, *, dias: int = DIAS_POR_DEFECTO, puesto_id=None, ahora=None) -> dict:
    autorizar(usuario)
    if dias not in DIAS_PERMITIDOS:
        raise ValidationError({"dias": "Usa 7, 30 o 90."})
    puesto = _puesto_visible(usuario, puesto_id) if puesto_id is not None else None

    ahora = ahora or timezone.now()
    hoy = ahora.astimezone(ZONA).date()
    primer_dia = hoy - timedelta(days=dias - 1)
    inicio = datetime.combine(primer_dia, time.min, tzinfo=ZONA)

    pagos = services.visibles_pagos(usuario, Pago.objects.all(), {}).filter(
        estado=Pago.Estado.APROBADO,
        fecha_aprobacion__gte=inicio,
        fecha_aprobacion__lte=ahora,
    )
    pedidos = Pedido.objects.filter(fecha_creacion__gte=inicio, fecha_creacion__lte=ahora)
    if not usuario.es_administrador:
        pedidos = pedidos.filter(id_puesto__id_vendedor_id=usuario.pk)
    if puesto is not None:
        pagos = pagos.filter(id_pedido__id_puesto_id=puesto.pk)
        pedidos = pedidos.filter(id_puesto_id=puesto.pk)

    neto = services.expresion_neto_vendedor()

    # 1. Totales del periodo.
    totales = pagos.aggregate(pedidos=Count("pk"), brutas=Sum("subtotal_pedido"), netos=Sum(neto))

    # 2. Por día, cortado en hora de Colombia (TruncDate con tzinfo vale en PostgreSQL y SQLite).
    filas_dia = (
        pagos.annotate(dia=TruncDate("fecha_aprobacion", tzinfo=ZONA))
        .values("dia")
        .annotate(n=Count("pk"), brutas=Sum("subtotal_pedido"), netos=Sum(neto))
        .order_by("dia")
    )
    por_fecha = {fila["dia"]: fila for fila in filas_dia}
    por_dia = []
    for desplazamiento in range(dias):
        dia: date = primer_dia + timedelta(days=desplazamiento)
        fila = por_fecha.get(dia)
        por_dia.append(
            {
                "fecha": dia.isoformat(),
                "pedidos": fila["n"] if fila else 0,
                "ventas_brutas": _texto(fila["brutas"] if fila else None),
                "ingresos_netos": _texto(fila["netos"] if fila else None),
            }
        )

    # 3. Productos vendidos (una fila por producto; se corta a 5 en Python y se suman las unidades).
    filas_producto = list(
        ItemPedido.objects.filter(id_pedido__pago__in=pagos.values("pk"))
        .values("id_producto")
        .annotate(
            unidades=Sum("cantidad"),
            brutas=Sum(F("precio_unitario") * F("cantidad"), output_field=_DINERO),
            nombre=Max("nombre_producto"),
            puesto_nombre=Max("id_pedido__id_puesto__nombre"),
        )
        .order_by("-unidades", "-brutas", "nombre")
    )
    unidades = sum(fila["unidades"] for fila in filas_producto)
    top = [
        {
            "id_producto": fila["id_producto"],
            "nombre": fila["nombre"],
            "unidades": fila["unidades"],
            "ventas_brutas": _texto(fila["brutas"]),
            "puesto_nombre": fila["puesto_nombre"] if usuario.es_administrador else None,
        }
        for fila in filas_producto[:MAXIMO_TOP]
    ]

    # 4. Pedidos creados en el periodo, por estado.
    conteos = pedidos.aggregate(
        **{f"e_{estado}": Count("pk", filter=Q(estado=estado)) for estado in Pedido.Estado.values},
        por_plazo=Count("pk", filter=Q(estado=Pedido.Estado.CANCELADO) & ~Q(motivo_cancelacion="")),
    )

    pagados = totales["pedidos"]
    brutas = totales["brutas"] or CERO
    ticket = (brutas / pagados).quantize(Decimal("0.01")) if pagados else CERO
    return {
        "dias": dias,
        "desde": primer_dia.isoformat(),
        "hasta": hoy.isoformat(),
        "zona_horaria": "America/Bogota",
        "puesto": {"id": puesto.pk, "nombre": puesto.nombre} if puesto else None,
        "totales": {
            "pedidos_pagados": pagados,
            "unidades": unidades,
            "ventas_brutas": _texto(brutas),
            "ingresos_netos": _texto(totales["netos"]),
            "ticket_promedio": _texto(ticket),
        },
        "por_dia": por_dia,
        "top_productos": top,
        "pedidos_por_estado": {estado: conteos[f"e_{estado}"] for estado in Pedido.Estado.values},
        "cancelados_por_plazo": conteos["por_plazo"],
        "generado_en": ahora.astimezone(ZONA).isoformat(timespec="seconds"),
    }
