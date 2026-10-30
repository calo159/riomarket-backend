"""Pruebas de la administración de usuarios: acceso, listado y acciones."""

from decimal import Decimal

import pytest
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Usuario, Vendedor
from apps.audit.models import RegistroAuditoria
from apps.catalog.models import Puesto
from apps.notifications.models import Notificacion
from apps.orders.models import Pedido
from tests.factories import PedidoFactory, UsuarioFactory

USUARIOS = "/api/admin/usuarios/"


def url(usuario, accion):
    return f"{USUARIOS}{usuario.pk}/{accion}/"


@pytest.mark.django_db
class TestAcceso:
    def test_anonimo_no_accede(self, cliente_anon):
        assert cliente_anon.get(USUARIOS).status_code in (401, 403)

    def test_comprador_no_accede(self, cliente_comprador):
        assert cliente_comprador.get(USUARIOS).status_code == 403

    def test_vendedor_no_accede(self, cliente_vendedor):
        assert cliente_vendedor.get(USUARIOS).status_code == 403


@pytest.mark.django_db
class TestListado:
    def test_admin_lista_y_filtra(self, cliente_admin, admin, comprador):
        respuesta = cliente_admin.get(USUARIOS)
        assert respuesta.status_code == 200
        assert respuesta.data["count"] == 2

        por_rol = cliente_admin.get(USUARIOS, {"rol": "comprador"})
        assert [u["id"] for u in por_rol.data["results"]] == [comprador.pk]

        por_texto = cliente_admin.get(USUARIOS, {"q": comprador.correo})
        assert [u["id"] for u in por_texto.data["results"]] == [comprador.pk]

    def test_filtro_invalido(self, cliente_admin):
        assert cliente_admin.get(USUARIOS, {"rol": "otro"}).status_code == 400

    def test_detalle_con_metricas(self, cliente_admin, admin, comprador, puesto):
        PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=Pedido.Estado.PENDIENTE)
        PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=Pedido.Estado.ENTREGADO)
        respuesta = cliente_admin.get(f"{USUARIOS}{comprador.pk}/")
        assert respuesta.status_code == 200
        assert respuesta.data["pedidos_como_comprador"] == 2
        assert respuesta.data["pedidos_activos"] == 1
        assert respuesta.data["acciones_permitidas"] == ["cambiar-rol", "roles", "suspender"]

    def test_admin_no_ve_acciones_sobre_si_mismo(self, cliente_admin, admin):
        respuesta = cliente_admin.get(f"{USUARIOS}{admin.pk}/")
        assert respuesta.data["acciones_permitidas"] == []
        assert respuesta.data["estado_verificacion"] is None


@pytest.mark.django_db
class TestCambiarRol:
    def test_comprador_a_vendedor_crea_solicitud_y_audita(self, cliente_admin, admin, comprador):
        refresh = RefreshToken.for_user(comprador)
        assert refresh is not None

        respuesta = cliente_admin.post(
            url(comprador, "cambiar-rol"),
            {"rol": "vendedor", "motivo": "Quiere abrir un puesto"},
            format="json",
        )
        assert respuesta.status_code == 200
        assert respuesta.data["rol"] == Usuario.Rol.VENDEDOR
        comprador.refresh_from_db()
        assert comprador.rol == Usuario.Rol.VENDEDOR
        assert Vendedor.objects.filter(
            id_usuario=comprador,
            estado_verificacion=Vendedor.EstadoVerificacion.PENDIENTE,
        ).exists()
        assert Notificacion.objects.filter(id_usuario=comprador).exists()
        assert RegistroAuditoria.objects.filter(
            entidad="usuario",
            id_entidad=comprador.pk,
            detalle__campo="rol",
            detalle__a="vendedor",
        ).exists()
        assert BlacklistedToken.objects.filter(token__user=comprador).exists()

    def test_no_puede_cambiar_su_propio_rol(self, cliente_admin, admin):
        respuesta = cliente_admin.post(
            url(admin, "cambiar-rol"),
            {"rol": "comprador", "motivo": "Prueba de autobloqueo"},
            format="json",
        )
        assert respuesta.status_code == 400

    def test_motivo_corto(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(
            url(comprador, "cambiar-rol"), {"rol": "vendedor", "motivo": "abc"}, format="json"
        )
        assert respuesta.status_code == 400

    def test_rol_invalido(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(
            url(comprador, "cambiar-rol"),
            {"rol": "superusuario", "motivo": "Motivo válido"},
            format="json",
        )
        assert respuesta.status_code == 400

    def test_pedidos_activos_como_comprador_bloquean(self, cliente_admin, comprador, puesto):
        PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=Pedido.Estado.PENDIENTE)
        respuesta = cliente_admin.post(
            url(comprador, "cambiar-rol"),
            {"rol": "vendedor", "motivo": "Cambio de rol"},
            format="json",
        )
        assert respuesta.status_code == 400
        comprador.refresh_from_db()
        assert comprador.rol == Usuario.Rol.COMPRADOR

    def test_pedidos_activos_en_puestos_bloquean(self, cliente_admin, vendedor, puesto, comprador):
        PedidoFactory(id_comprador=comprador, id_puesto=puesto, estado=Pedido.Estado.EN_CAMINO)
        respuesta = cliente_admin.post(
            url(vendedor, "cambiar-rol"),
            {"rol": "comprador", "motivo": "Cambio de rol"},
            format="json",
        )
        assert respuesta.status_code == 400

    def test_vendedor_a_comprador_inactiva_puestos(self, cliente_admin, vendedor, puesto):
        respuesta = cliente_admin.post(
            url(vendedor, "cambiar-rol"),
            {"rol": "comprador", "motivo": "Deja de vender"},
            format="json",
        )
        assert respuesta.status_code == 200
        puesto.refresh_from_db()
        assert puesto.estado == Puesto.Estado.INACTIVO

    def test_no_cambia_al_mismo_rol(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(
            url(comprador, "cambiar-rol"),
            {"rol": "comprador", "motivo": "Motivo válido"},
            format="json",
        )
        assert respuesta.status_code == 400


@pytest.mark.django_db
class TestSuspenderReactivar:
    def test_suspende_cuenta_y_puestos(self, cliente_admin, admin, vendedor, puesto):
        RefreshToken.for_user(vendedor)
        respuesta = cliente_admin.post(
            url(vendedor, "suspender"), {"motivo": "Incumplimiento"}, format="json"
        )
        assert respuesta.status_code == 200
        assert respuesta.data["estado"] == Usuario.Estado.SUSPENDIDO
        vendedor.refresh_from_db()
        puesto.refresh_from_db()
        assert vendedor.estado == Usuario.Estado.SUSPENDIDO
        assert puesto.estado == Puesto.Estado.SUSPENDIDO
        assert Notificacion.objects.filter(id_usuario=vendedor).exists()
        assert BlacklistedToken.objects.filter(token__user=vendedor).exists()
        assert RegistroAuditoria.objects.filter(
            entidad="usuario", id_entidad=vendedor.pk, detalle__campo="estado"
        ).exists()

    def test_no_se_suspende_a_si_mismo(self, cliente_admin, admin):
        respuesta = cliente_admin.post(
            url(admin, "suspender"), {"motivo": "Prueba de autobloqueo"}, format="json"
        )
        assert respuesta.status_code == 400

    def test_motivo_obligatorio(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(url(comprador, "suspender"), {"motivo": "no"}, format="json")
        assert respuesta.status_code == 400

    def test_ya_suspendido(self, cliente_admin, comprador):
        comprador.suspendir()
        respuesta = cliente_admin.post(
            url(comprador, "suspender"), {"motivo": "Motivo válido"}, format="json"
        )
        assert respuesta.status_code == 400

    def test_reactivar(self, cliente_admin, comprador):
        comprador.suspendir()
        respuesta = cliente_admin.post(url(comprador, "reactivar"), {}, format="json")
        assert respuesta.status_code == 200
        comprador.refresh_from_db()
        assert comprador.estado == Usuario.Estado.ACTIVO
        assert Notificacion.objects.filter(id_usuario=comprador).exists()

    def test_reactivar_activo(self, cliente_admin, comprador):
        respuesta = cliente_admin.post(url(comprador, "reactivar"), {}, format="json")
        assert respuesta.status_code == 400


@pytest.mark.django_db
class TestOrdenamiento:
    def test_orden_por_nombre(self, cliente_admin, admin):
        UsuarioFactory(nombre="Zulema", rol=Usuario.Rol.COMPRADOR)
        UsuarioFactory(nombre="Andrés", rol=Usuario.Rol.COMPRADOR)
        respuesta = cliente_admin.get(USUARIOS, {"ordering": "nombre", "page_size": 100})
        nombres = [u["nombre"] for u in respuesta.data["results"]]
        assert nombres == sorted(nombres)
        assert cliente_admin.get(USUARIOS, {"ordering": "password"}).status_code == 400


@pytest.mark.django_db
class TestResumen:
    def test_resumen(self, cliente_admin, admin, comprador, vendedor, puesto):
        from django.utils import timezone

        from apps.payments.models import Pago
        from tests.factories import CuponFactory, PagoFactory, ResenaFactory

        pedido = PedidoFactory(
            id_comprador=comprador,
            id_puesto=puesto,
            estado=Pedido.Estado.EN_CAMINO,
            no_recibido_en=timezone.now(),
        )
        PagoFactory(
            id_pedido=pedido,
            estado=Pago.Estado.APROBADO,
            subtotal_pedido=Decimal("10000.00"),
            comision_plataforma=Decimal("500.00"),
            total_cobrado=Decimal("10000.00"),
        )
        ResenaFactory(id_usuario=comprador, id_puesto=puesto, visible=False)
        CuponFactory(activo=True)

        respuesta = cliente_admin.get("/api/admin/resumen/")
        assert respuesta.status_code == 200
        assert respuesta.data["usuarios"]["total"] == 3
        assert respuesta.data["pedidos"]["con_no_recibido"] == 1
        assert respuesta.data["pagos"]["total_vendido"] == "10000.00"
        assert respuesta.data["pagos"]["comision"] == "500.00"
        assert respuesta.data["resenas"]["ocultas"] == 1
        assert respuesta.data["cupones"]["activos"] == 1
        assert respuesta.data["productos"]["bloqueados"] == 0
        assert len(respuesta.data["pedidos"]["por_estado"]) == 7
        assert len(respuesta.data["usuarios"]["por_rol"]) == 3
        assert len(respuesta.data["puestos"]["por_estado"]) == 3
