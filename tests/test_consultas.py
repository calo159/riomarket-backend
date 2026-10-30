"""Presupuesto de consultas de los listados más usados (hallazgos R-05..R-12)."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.services import invalidar_sesiones
from apps.rbac.models import Rol, UsuarioRol
from tests.factories import PedidoFactory, PuestoFactory, UsuarioFactory, VendedorFactory

pytestmark = pytest.mark.django_db


def _contar(cliente, url):
    with CaptureQueriesContext(connection) as contexto:
        respuesta = cliente.get(url)
    assert respuesta.status_code == 200
    return len(contexto), contexto


def _admin():
    cliente = APIClient()
    cliente.force_authenticate(UsuarioFactory(rol="administrador"))
    return cliente


def _sql_count(contexto):
    return [
        q["sql"] for q in contexto.captured_queries if q["sql"].lstrip().startswith("SELECT COUNT")
    ]


def test_invalidar_sesiones_es_constante_con_muchos_tokens():
    usuario = UsuarioFactory()
    for _ in range(10):
        RefreshToken.for_user(usuario)
    with CaptureQueriesContext(connection) as contexto:
        invalidar_sesiones(usuario)
    print(f"MEDICION invalidar_sesiones(10 tokens)={len(contexto)}")
    assert len(contexto) <= 3


def test_listado_de_roles():
    for i in range(30):
        rol = Rol.objects.create(nombre=f"rol{i}")
        UsuarioRol.objects.create(id_usuario=UsuarioFactory(), id_rol=rol)
    n, _ = _contar(_admin(), "/api/admin/roles/?page_size=100")
    print(f"MEDICION roles={n}")
    assert n <= 12


def test_listado_de_usuarios_y_su_conteo():
    for _ in range(25):
        PedidoFactory()
    n, contexto = _contar(_admin(), "/api/admin/usuarios/")
    conteos = _sql_count(contexto)
    con_join = any("orders_pedido" in c for c in conteos)
    print(f"MEDICION usuarios={n}; count_con_join_pedidos={con_join}")
    assert n <= 14
    assert not any("orders_pedido" in c for c in conteos)


def test_listado_de_puestos_y_su_conteo():
    for _ in range(15):
        vendedor = UsuarioFactory(rol="vendedor")
        VendedorFactory(id_usuario=vendedor)
        PuestoFactory(id_vendedor=vendedor)
    n, contexto = _contar(APIClient(), "/api/catalog/puestos/")
    conteos = _sql_count(contexto)
    con_join = any("reviews_resena" in c for c in conteos)
    print(f"MEDICION puestos={n}; count_con_resenas={con_join}")
    assert n <= 8
    assert not any("reviews_resena" in c or "accounts_usuario" in c for c in conteos)


@pytest.mark.parametrize(
    "url",
    [
        "/api/notifications/notificaciones/",
        "/api/addresses/direcciones/",
        "/api/orders/pedidos/",
        "/api/payments/pagos/",
    ],
)
def test_listados_personales_no_crecen_con_las_filas(url):
    from tests.factories import DireccionFactory, NotificacionFactory, PagoFactory

    usuario = UsuarioFactory(rol="comprador")
    cliente = APIClient()
    cliente.force_authenticate(usuario)

    def sembrar(n):
        for _ in range(n):
            pedido = PedidoFactory(id_comprador=usuario)
            NotificacionFactory(id_usuario=usuario, id_pedido=pedido)
            DireccionFactory(id_usuario=usuario)
            PagoFactory(id_pedido=pedido)

    sembrar(2)
    pocas, _ = _contar(cliente, url)
    sembrar(10)
    muchas, _ = _contar(cliente, url)
    print(f"MEDICION {url}: 2 filas={pocas}, 12 filas={muchas}")
    assert muchas == pocas


def test_auditoria_filtra_por_dia_en_hora_local():
    from datetime import datetime

    from django.utils import timezone

    from apps.audit.models import RegistroAuditoria

    admin = _admin()
    zona = timezone.get_current_timezone()
    inicio = timezone.make_aware(datetime(2026, 3, 10, 0, 0, 1), zona)
    fin = timezone.make_aware(datetime(2026, 3, 10, 23, 59, 59), zona)
    fuera = timezone.make_aware(datetime(2026, 3, 11, 0, 0, 1), zona)
    for momento in (inicio, fin, fuera):
        registro = RegistroAuditoria.objects.create(accion="crear", entidad="x", detalle={})
        RegistroAuditoria.objects.filter(pk=registro.pk).update(fecha_creacion=momento)

    respuesta = admin.get("/api/audit/registros/?desde=2026-03-10&hasta=2026-03-10")
    assert respuesta.status_code == 200
    assert respuesta.data["count"] == 2
    assert admin.get("/api/audit/registros/?desde=no-es-fecha").status_code == 400
