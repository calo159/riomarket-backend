"""Panel de ventas (ADR-014): ``GET /api/payments/ventas/``."""

from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.orders.models import Pedido
from apps.payments import estadisticas
from apps.payments.models import Pago
from apps.payments.services import resumen_ingresos
from tests.factories import (
    ItemPedidoFactory,
    PagoFactory,
    PedidoFactory,
    ProductoFactory,
    PuestoFactory,
    UsuarioFactory,
    VendedorFactory,
)

from .conftest import PAGOS

VENTAS = "/api/payments/ventas/"
BOGOTA = ZoneInfo("America/Bogota")
# Miércoles 21 de octubre de 2026, 15:00 en Bogotá (hora de referencia fija de las pruebas).
AHORA = datetime(2026, 10, 21, 15, 0, tzinfo=BOGOTA)

pytestmark = pytest.mark.django_db


def _pago(
    puesto,
    *,
    cuando=None,
    estado=Pago.Estado.APROBADO,
    subtotal="10000.00",
    comision="500.00",
    descuento="0.00",
    tarifa="0.00",
):
    """Pago con montos coherentes (``total = subtotal + tarifa - descuento``)."""
    pedido = PedidoFactory(
        id_puesto=puesto,
        subtotal=Decimal(subtotal),
        tarifa_domicilio=Decimal(tarifa),
        total=Decimal(subtotal) + Decimal(tarifa),
    )
    cuando = cuando or (AHORA - timedelta(hours=2))
    return PagoFactory(
        id_pedido=pedido,
        estado=estado,
        subtotal_pedido=Decimal(subtotal),
        tarifa_domicilio_aplicada=Decimal(tarifa),
        comision_plataforma=Decimal(comision),
        descuento_aplicado=Decimal(descuento),
        total_cobrado=Decimal(subtotal) + Decimal(tarifa) - Decimal(descuento),
        fecha_aprobacion=cuando if estado == Pago.Estado.APROBADO else None,
    )


def _ventas(usuario, **kwargs):
    return estadisticas.ventas(usuario, ahora=AHORA, **kwargs)


def _cliente(usuario):
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


def _otro_vendedor():
    usuario = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
    VendedorFactory(id_usuario=usuario)
    return usuario, PuestoFactory(id_vendedor=usuario, nombre="Puesto ajeno")


# ---------------------------------------------------------------------------
# Acceso
# ---------------------------------------------------------------------------
def test_vendedor_ve_solo_sus_puestos(cliente_vendedor, puesto):
    _pago(puesto, cuando=timezone.now() - timedelta(hours=1))
    _, ajeno = _otro_vendedor()
    pago_ajeno = _pago(ajeno, subtotal="99000.00", cuando=timezone.now() - timedelta(hours=1))
    ItemPedidoFactory(id_pedido=pago_ajeno.id_pedido, nombre_producto="Secreto", cantidad=7)

    respuesta = cliente_vendedor.get(VENTAS)
    assert respuesta.status_code == status.HTTP_200_OK
    datos = respuesta.json()
    assert datos["totales"]["pedidos_pagados"] == 1
    assert datos["totales"]["ventas_brutas"] == "10000.00"
    assert datos["totales"]["ingresos_netos"] == "9500.00"
    assert datos["top_productos"] == []
    assert sum(d["pedidos"] for d in datos["por_dia"]) == 1
    # Los pedidos por estado tampoco incluyen los de otro puesto.
    assert sum(datos["pedidos_por_estado"].values()) == 1
    assert "Secreto" not in respuesta.content.decode()


def test_vendedor_con_dos_puestos_suma_ambos(cliente_vendedor, vendedor, puesto):
    segundo = PuestoFactory(id_vendedor=vendedor)
    ahora = timezone.now() - timedelta(hours=1)
    _pago(puesto, cuando=ahora)
    _pago(segundo, cuando=ahora)
    assert cliente_vendedor.get(VENTAS).json()["totales"]["pedidos_pagados"] == 2
    filtrado = cliente_vendedor.get(VENTAS, {"puesto": segundo.pk}).json()
    assert filtrado["totales"]["pedidos_pagados"] == 1
    assert filtrado["puesto"] == {"id": segundo.pk, "nombre": segundo.nombre}


def test_admin_ve_todo_el_mercado(cliente_admin, puesto):
    ahora = timezone.now() - timedelta(hours=1)
    _pago(puesto, cuando=ahora)
    _, ajeno = _otro_vendedor()
    pago = _pago(ajeno, cuando=ahora)
    ItemPedidoFactory(id_pedido=pago.id_pedido, cantidad=2)
    datos = cliente_admin.get(VENTAS).json()
    assert datos["totales"]["pedidos_pagados"] == 2
    assert datos["puesto"] is None
    assert datos["top_productos"][0]["puesto_nombre"] == "Puesto ajeno"
    filtrado = cliente_admin.get(VENTAS, {"puesto": ajeno.pk}).json()
    assert filtrado["totales"]["pedidos_pagados"] == 1


def test_el_vendedor_no_recibe_nombre_de_puesto_en_el_top(cliente_vendedor, puesto):
    pago = _pago(puesto, cuando=timezone.now() - timedelta(hours=1))
    ItemPedidoFactory(id_pedido=pago.id_pedido)
    assert cliente_vendedor.get(VENTAS).json()["top_productos"][0]["puesto_nombre"] is None


def test_comprador_recibe_403(cliente_comprador):
    assert cliente_comprador.get(VENTAS).status_code == status.HTTP_403_FORBIDDEN
    # El rol se valida antes que los parámetros.
    assert cliente_comprador.get(VENTAS, {"dias": 5}).status_code == status.HTTP_403_FORBIDDEN


def test_anonimo_recibe_401(cliente_anon):
    assert cliente_anon.get(VENTAS).status_code == status.HTTP_401_UNAUTHORIZED


def test_vendedor_suspendido_no_accede(vendedor):
    vendedor.estado = Usuario.Estado.SUSPENDIDO
    vendedor.save(update_fields=["estado"])
    assert _cliente(vendedor).get(VENTAS).status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )


def test_puesto_ajeno_403_e_inexistente_404(cliente_vendedor, cliente_admin, puesto):
    _, ajeno = _otro_vendedor()
    respuesta = cliente_vendedor.get(VENTAS, {"puesto": ajeno.pk})
    assert respuesta.status_code == status.HTTP_403_FORBIDDEN
    assert "Ese puesto no es tuyo" in respuesta.content.decode()
    assert cliente_vendedor.get(VENTAS, {"puesto": 999999}).status_code == status.HTTP_404_NOT_FOUND
    assert cliente_admin.get(VENTAS, {"puesto": 999999}).status_code == status.HTTP_404_NOT_FOUND
    assert cliente_admin.get(VENTAS, {"puesto": ajeno.pk}).status_code == status.HTTP_200_OK


def test_dias_invalido_400(cliente_vendedor):
    for dias in ("5", "abc", "0", "-30"):
        respuesta = cliente_vendedor.get(VENTAS, {"dias": dias})
        assert respuesta.status_code == status.HTTP_400_BAD_REQUEST, dias
    assert "Usa 7, 30 o 90." in cliente_vendedor.get(VENTAS, {"dias": 15}).content.decode()
    assert cliente_vendedor.get(VENTAS, {"puesto": "x"}).status_code == status.HTTP_400_BAD_REQUEST
    for dias in (7, 30, 90):
        assert cliente_vendedor.get(VENTAS, {"dias": dias}).json()["dias"] == dias


def test_vendedor_no_verificado_ve_sus_ventas(cliente_vendedor, vendedor, puesto):
    vendedor.vendedor.estado_verificacion = vendedor.vendedor.EstadoVerificacion.PENDIENTE
    vendedor.vendedor.save(update_fields=["estado_verificacion"])
    assert not vendedor.puede_publicar()
    _pago(puesto, cuando=timezone.now() - timedelta(hours=1))
    datos = cliente_vendedor.get(VENTAS).json()
    assert datos["totales"]["pedidos_pagados"] == 1


# ---------------------------------------------------------------------------
# Serie diaria y hora de Colombia
# ---------------------------------------------------------------------------
def test_vendedor_sin_ventas_recibe_ceros_y_listas_vacias(vendedor):
    datos = _ventas(vendedor)
    assert datos["totales"] == {
        "pedidos_pagados": 0,
        "unidades": 0,
        "ventas_brutas": "0.00",
        "ingresos_netos": "0.00",
        "ticket_promedio": "0.00",
    }
    assert datos["top_productos"] == []
    assert len(datos["por_dia"]) == 30
    assert all(d["pedidos"] == 0 and d["ingresos_netos"] == "0.00" for d in datos["por_dia"])
    assert set(datos["pedidos_por_estado"].values()) == {0}
    assert datos["cancelados_por_plazo"] == 0


def test_por_dia_tiene_todas_las_fechas_con_ceros(vendedor, puesto):
    _pago(puesto, cuando=AHORA - timedelta(days=3), subtotal="20000.00", comision="1000.00")
    for dias in (7, 30, 90):
        datos = _ventas(vendedor, dias=dias)
        fechas = [d["fecha"] for d in datos["por_dia"]]
        esperadas = [(AHORA.date() - timedelta(days=dias - 1 - i)).isoformat() for i in range(dias)]
        assert fechas == esperadas
        assert fechas[-1] == datos["hasta"] == "2026-10-21"
        assert fechas[0] == datos["desde"]
    con_ventas = [d for d in _ventas(vendedor, dias=7)["por_dia"] if d["pedidos"]]
    assert con_ventas == [
        {
            "fecha": "2026-10-18",
            "pedidos": 1,
            "ventas_brutas": "20000.00",
            "ingresos_netos": "19000.00",
        }
    ]


def test_dia_en_hora_de_colombia(vendedor, puesto):
    # 23:30 del 19 oct en Bogotá = 04:30 UTC del 20: cuenta el 19.
    _pago(puesto, cuando=datetime(2026, 10, 19, 23, 30, tzinfo=BOGOTA))
    # 00:30 del 20 oct en Bogotá = 05:30 UTC del 20: cuenta el 20.
    _pago(puesto, cuando=datetime(2026, 10, 20, 0, 30, tzinfo=BOGOTA))
    por_fecha = {d["fecha"]: d["pedidos"] for d in _ventas(vendedor, dias=7)["por_dia"]}
    assert por_fecha["2026-10-19"] == 1
    assert por_fecha["2026-10-20"] == 1
    assert por_fecha["2026-10-21"] == 0


def test_el_primer_dia_empieza_a_medianoche_de_colombia(vendedor, puesto):
    # Con dias=7 el primer día es el 15 oct (00:00 Bogotá): 23:59 del 14 queda fuera.
    _pago(puesto, cuando=datetime(2026, 10, 14, 23, 59, tzinfo=BOGOTA))
    _pago(puesto, cuando=datetime(2026, 10, 15, 0, 1, tzinfo=BOGOTA))
    datos = _ventas(vendedor, dias=7)
    assert datos["desde"] == "2026-10-15"
    assert datos["totales"]["pedidos_pagados"] == 1
    assert datos["por_dia"][0]["pedidos"] == 1


# ---------------------------------------------------------------------------
# Dinero
# ---------------------------------------------------------------------------
def test_ingresos_netos_coinciden_con_resumen_ingresos(vendedor, puesto):
    _pago(puesto, cuando=AHORA - timedelta(days=1), subtotal="10000.00", comision="500.00")
    _pago(puesto, cuando=AHORA - timedelta(days=5), subtotal="8000.00", descuento="1000.00")
    _pago(puesto, cuando=AHORA - timedelta(days=9), subtotal="1000.00", descuento="1000.00")
    _pago(puesto, cuando=AHORA - timedelta(days=20), subtotal="33333.33", comision="1666.67")
    _pago(puesto, estado=Pago.Estado.PENDIENTE)
    _pago(puesto, estado=Pago.Estado.RECHAZADO)
    _pago(puesto, estado=Pago.Estado.ANULADO)
    _pago(puesto, estado=Pago.Estado.REEMBOLSADO)
    _, ajeno = _otro_vendedor()
    _pago(ajeno, cuando=AHORA - timedelta(days=2))

    datos = _ventas(vendedor, dias=90)
    resumen = resumen_ingresos(vendedor)
    assert datos["totales"]["pedidos_pagados"] == resumen["pagos_aprobados"] == 4
    assert datos["totales"]["ingresos_netos"] == resumen["ingresos_aprobados"]
    suma_diaria = sum(Decimal(d["ingresos_netos"]) for d in datos["por_dia"])
    assert str(suma_diaria) == resumen["ingresos_aprobados"]
    # Y coincide con la propiedad del modelo, pago por pago.
    pagos = Pago.objects.filter(estado=Pago.Estado.APROBADO, id_pedido__id_puesto=puesto)
    assert Decimal(datos["totales"]["ingresos_netos"]) == sum(p.neto_vendedor for p in pagos)


def test_ingresos_netos_del_administrador_coinciden_con_resumen(admin, puesto):
    _, ajeno = _otro_vendedor()
    _pago(puesto, cuando=AHORA - timedelta(days=2), subtotal="7000.00", comision="350.00")
    _pago(ajeno, cuando=AHORA - timedelta(days=40), subtotal="4000.00", comision="200.00")
    datos = _ventas(admin, dias=90)
    assert datos["totales"]["ingresos_netos"] == resumen_ingresos(admin)["ingresos_aprobados"]


def test_reembolsado_no_cuenta(vendedor, puesto):
    pago = _pago(puesto)
    assert _ventas(vendedor)["totales"]["pedidos_pagados"] == 1
    Pago.objects.filter(pk=pago.pk).update(estado=Pago.Estado.REEMBOLSADO)
    datos = _ventas(vendedor)
    assert datos["totales"]["pedidos_pagados"] == 0
    assert datos["totales"]["ingresos_netos"] == "0.00"


def test_pagos_no_aprobados_no_cuentan(vendedor, puesto):
    for estado in (
        Pago.Estado.PENDIENTE,
        Pago.Estado.PROCESANDO,
        Pago.Estado.RECHAZADO,
        Pago.Estado.ANULADO,
    ):
        _pago(puesto, estado=estado)
    assert _ventas(vendedor)["totales"]["pedidos_pagados"] == 0


def test_neto_no_baja_de_cero_con_cupon_alto(vendedor, puesto):
    _pago(puesto, subtotal="1000.00", comision="50.00", descuento="1000.00")
    datos = _ventas(vendedor)
    assert datos["totales"]["ingresos_netos"] == "0.00"
    assert datos["totales"]["ventas_brutas"] == "1000.00"


def test_tarifa_de_domicilio_no_suma(vendedor, puesto):
    _pago(puesto, subtotal="10000.00", comision="500.00", tarifa="4000.00")
    datos = _ventas(vendedor)
    assert datos["totales"]["ventas_brutas"] == "10000.00"
    assert datos["totales"]["ingresos_netos"] == "9500.00"
    assert datos["por_dia"][-1]["ventas_brutas"] == "10000.00"


def test_ticket_promedio(vendedor, puesto):
    _pago(puesto, subtotal="10000.00")
    _pago(puesto, subtotal="5000.00")
    _pago(puesto, subtotal="5000.00")
    assert _ventas(vendedor)["totales"]["ticket_promedio"] == "6666.67"


# ---------------------------------------------------------------------------
# Productos más vendidos y estados
# ---------------------------------------------------------------------------
def test_top_productos_orden_y_maximo_cinco(vendedor, puesto):
    productos = [ProductoFactory(id_puesto=puesto, nombre=f"P{i}") for i in range(7)]
    pago = _pago(puesto)
    cantidades = [3, 9, 1, 5, 5, 2, 4]
    precios = ["1000.00", "1000.00", "1000.00", "1000.00", "2000.00", "1000.00", "1000.00"]
    for producto, cantidad, precio in zip(productos, cantidades, precios, strict=True):
        ItemPedidoFactory(
            id_pedido=pago.id_pedido,
            id_producto=producto,
            nombre_producto=producto.nombre,
            cantidad=cantidad,
            precio_unitario=Decimal(precio),
        )
    datos = _ventas(vendedor)
    top = datos["top_productos"]
    assert [t["nombre"] for t in top] == ["P1", "P4", "P3", "P6", "P0"]
    assert top[0]["unidades"] == 9
    assert top[0]["ventas_brutas"] == "9000.00"
    assert top[1]["ventas_brutas"] == "10000.00"
    # Las unidades totales cuentan TODOS los productos, no solo los cinco primeros.
    assert datos["totales"]["unidades"] == sum(cantidades)


def test_top_solo_cuenta_pedidos_con_pago_aprobado(vendedor, puesto):
    producto = ProductoFactory(id_puesto=puesto)
    aprobado = _pago(puesto)
    pendiente = _pago(puesto, estado=Pago.Estado.PENDIENTE)
    ItemPedidoFactory(id_pedido=aprobado.id_pedido, id_producto=producto, cantidad=2)
    ItemPedidoFactory(id_pedido=pendiente.id_pedido, id_producto=producto, cantidad=50)
    sin_pago = PedidoFactory(id_puesto=puesto)
    ItemPedidoFactory(id_pedido=sin_pago, id_producto=producto, cantidad=40)
    assert [t["unidades"] for t in _ventas(vendedor)["top_productos"]] == [2]


def test_top_incluye_encargos(vendedor, puesto):
    producto = ProductoFactory(id_puesto=puesto, nombre="Torta de mora")
    pago = _pago(puesto)
    ItemPedidoFactory(
        id_pedido=pago.id_pedido,
        id_producto=producto,
        cantidad=1,
        modalidad="encargo",
        detalles="Sin nueces",
    )
    top = _ventas(vendedor)["top_productos"]
    assert top[0]["nombre"] == "Torta de mora"
    assert top[0]["unidades"] == 1


def test_pedidos_por_estado_y_cancelados_por_plazo(vendedor, puesto):
    PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.PENDIENTE)
    PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.ENTREGADO)
    PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.ENTREGADO)
    PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.CANCELADO)
    PedidoFactory(
        id_puesto=puesto,
        estado=Pedido.Estado.CANCELADO,
        motivo_cancelacion=Pedido.MotivoCancelacion.NO_RECOGIDO,
    )
    viejo = PedidoFactory(id_puesto=puesto, estado=Pedido.Estado.ENTREGADO)
    Pedido.objects.filter(pk=viejo.pk).update(fecha_creacion=timezone.now() - timedelta(days=60))
    PedidoFactory(estado=Pedido.Estado.PENDIENTE)  # de otro puesto

    ahora = timezone.now()
    datos = estadisticas.ventas(vendedor, dias=30, ahora=ahora)
    assert datos["pedidos_por_estado"] == {
        "pendiente": 1,
        "confirmado": 0,
        "en_preparacion": 0,
        "en_camino": 0,
        "listo_para_recoger": 0,
        "entregado": 2,
        "cancelado": 2,
    }
    assert datos["cancelados_por_plazo"] == 1
    # En 90 días sí entra el pedido de hace 60.
    en_90 = estadisticas.ventas(vendedor, dias=90, ahora=ahora)
    assert en_90["pedidos_por_estado"]["entregado"] == 3


# ---------------------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------------------
def _sembrar_ventas(puesto, n):
    producto = ProductoFactory(id_puesto=puesto)
    for _ in range(n):
        pago = _pago(puesto)
        ItemPedidoFactory(id_pedido=pago.id_pedido, id_producto=producto, cantidad=2)
        ItemPedidoFactory(id_pedido=pago.id_pedido, cantidad=1)


def _consultas(funcion):
    with CaptureQueriesContext(connection) as contexto:
        funcion()
    return len(contexto)


@pytest.mark.parametrize("rol", ["vendedor", "admin"])
def test_consultas_constantes_sin_y_con_puesto(rol, vendedor, admin, puesto):
    usuario = vendedor if rol == "vendedor" else admin
    _sembrar_ventas(puesto, 1)
    sin_filtro_uno = _consultas(lambda: _ventas(usuario))
    con_filtro_uno = _consultas(lambda: _ventas(usuario, puesto_id=puesto.pk))
    _sembrar_ventas(puesto, 39)
    assert Pago.objects.count() == 40
    sin_filtro_muchos = _consultas(lambda: _ventas(usuario))
    con_filtro_muchos = _consultas(lambda: _ventas(usuario, puesto_id=puesto.pk))
    assert sin_filtro_uno == sin_filtro_muchos == 4
    assert con_filtro_uno == con_filtro_muchos == 5


def test_consultas_constantes_por_la_api(cliente_vendedor, puesto):
    _sembrar_ventas(puesto, 1)
    uno = _consultas(lambda: cliente_vendedor.get(VENTAS))
    _sembrar_ventas(puesto, 30)
    muchos = _consultas(lambda: cliente_vendedor.get(VENTAS))
    assert uno == muchos


def test_el_resumen_de_ingresos_sigue_igual(cliente_vendedor, puesto):
    _pago(puesto)
    respuesta = cliente_vendedor.get(f"{PAGOS}resumen/")
    assert respuesta.data == {"pagos_aprobados": 1, "ingresos_aprobados": "9500.00"}
