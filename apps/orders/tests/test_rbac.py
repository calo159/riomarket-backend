"""Pruebas de la matriz RBAC de pedidos y de ``acciones_permitidas``."""

import pytest
from django.contrib.auth.models import AnonymousUser

from apps.accounts.models import Usuario
from apps.orders import permissions, services
from apps.orders.models import Pedido
from apps.orders.permissions import Accion
from tests.factories import PedidoFactory, ProductoFactory, PuestoFactory, UsuarioFactory

PEDIDOS = "/api/orders/pedidos/"
DOMICILIO = Pedido.TipoEntrega.DOMICILIO


def pedido_en(estado, comprador, puesto, **extra):
    return PedidoFactory(estado=estado, id_comprador=comprador, id_puesto=puesto, **extra)


@pytest.mark.django_db
class TestMatrizDeclarada:
    def test_cada_rol_tiene_entrada(self):
        assert set(permissions.PERMISOS) == set(Usuario.Rol.values)

    def test_cada_accion_esta_declarada_en_algun_rol(self):
        declaradas = {str(accion) for reglas in permissions.PERMISOS.values() for accion in reglas}
        assert declaradas == set(Accion.values)

    def test_destinos_de_transicion_tienen_accion(self):
        destinos = {
            destino
            for tabla in services.TRANSICIONES_POR_TIPO.values()
            for destinos in tabla.values()
            for destino in destinos
        }
        assert destinos <= set(permissions.ACCION_POR_DESTINO)

    def test_acciones_por_rol(self):
        assert set(permissions.PERMISOS[Usuario.Rol.COMPRADOR]) == {
            Accion.CREAR,
            Accion.EDITAR,
            Accion.ENTREGAR,
            Accion.NO_RECIBIDO,
            Accion.CANCELAR,
        }
        assert set(permissions.PERMISOS[Usuario.Rol.VENDEDOR]) == {
            Accion.CONFIRMAR,
            Accion.EN_PREPARACION,
            Accion.ENVIAR,
            Accion.LISTO,
            Accion.ENTREGAR,
            Accion.CANCELAR,
        }
        assert set(permissions.PERMISOS[Usuario.Rol.ADMINISTRADOR]) == set(Accion.values) - {
            Accion.CREAR
        }


@pytest.mark.django_db
class TestSujeto:
    def test_anonimo_no_puede_nada(self, comprador, puesto):
        pedido = pedido_en(Pedido.Estado.EN_CAMINO, comprador, puesto, tipo_entrega=DOMICILIO)
        anonimo = AnonymousUser()
        assert all(not permissions.puede(anonimo, accion, pedido) for accion in Accion.values)

    def test_suspendido_no_puede_nada(self, comprador, puesto):
        pedido = pedido_en(Pedido.Estado.EN_CAMINO, comprador, puesto, tipo_entrega=DOMICILIO)
        comprador.suspendir()
        comprador.refresh_from_db()
        assert all(not permissions.puede(comprador, accion, pedido) for accion in Accion.values)

    def test_comprador_crea(self, comprador, vendedor, admin):
        assert permissions.puede(comprador, Accion.CREAR)
        assert not permissions.puede(vendedor, Accion.CREAR)
        assert not permissions.puede(admin, Accion.CREAR)


@pytest.mark.django_db
class TestRelaciones:
    def test_comprador_solo_su_pedido(self, comprador, puesto):
        otro = UsuarioFactory(rol=Usuario.Rol.COMPRADOR)
        propio = pedido_en(Pedido.Estado.EN_CAMINO, comprador, puesto, tipo_entrega=DOMICILIO)
        ajeno = pedido_en(Pedido.Estado.EN_CAMINO, otro, puesto, tipo_entrega=DOMICILIO)
        for accion in (Accion.EDITAR, Accion.ENTREGAR, Accion.NO_RECIBIDO, Accion.CANCELAR):
            assert permissions.puede(comprador, accion, propio)
            assert not permissions.puede(comprador, accion, ajeno)
            assert not permissions.puede(otro, accion, propio)

    def test_vendedor_solo_su_puesto(self, vendedor, comprador, puesto):
        otro_vendedor = UsuarioFactory(rol=Usuario.Rol.VENDEDOR)
        otro_puesto = PuestoFactory(id_vendedor=otro_vendedor)
        propio = pedido_en(Pedido.Estado.CONFIRMADO, comprador, puesto)
        ajeno = pedido_en(Pedido.Estado.CONFIRMADO, comprador, otro_puesto)
        for accion in (Accion.CONFIRMAR, Accion.EN_PREPARACION, Accion.ENVIAR, Accion.CANCELAR):
            assert permissions.puede(vendedor, accion, propio)
            assert not permissions.puede(vendedor, accion, ajeno)
            assert not permissions.puede(otro_vendedor, accion, propio)

    def test_vendedor_no_toca_acciones_del_comprador(self, vendedor, comprador, puesto):
        pedido = pedido_en(Pedido.Estado.EN_CAMINO, comprador, puesto, tipo_entrega=DOMICILIO)
        for accion in (Accion.EDITAR, Accion.ENTREGAR, Accion.NO_RECIBIDO):
            assert not permissions.puede(vendedor, accion, pedido)

    def test_administrador_puede_operar_cualquier_pedido(self, admin, comprador, puesto):
        pedido = pedido_en(Pedido.Estado.EN_CAMINO, comprador, puesto, tipo_entrega=DOMICILIO)
        for accion in set(Accion.values) - {Accion.CREAR}:
            assert permissions.puede(admin, accion, pedido)


@pytest.mark.django_db
class TestAccionesDisponibles:
    @pytest.mark.parametrize(
        "estado,rol,esperadas",
        [
            (Pedido.Estado.PENDIENTE, Usuario.Rol.COMPRADOR, ["editar", "cancelar", "pagar"]),
            (Pedido.Estado.PENDIENTE, Usuario.Rol.VENDEDOR, ["confirmar", "cancelar"]),
            (
                Pedido.Estado.PENDIENTE,
                Usuario.Rol.ADMINISTRADOR,
                ["editar", "confirmar", "cancelar", "pagar"],
            ),
            (Pedido.Estado.CONFIRMADO, Usuario.Rol.COMPRADOR, ["cancelar"]),
            (Pedido.Estado.CONFIRMADO, Usuario.Rol.VENDEDOR, ["en-preparacion", "cancelar"]),
            (
                Pedido.Estado.CONFIRMADO,
                Usuario.Rol.ADMINISTRADOR,
                ["en-preparacion", "cancelar"],
            ),
            (Pedido.Estado.EN_PREPARACION, Usuario.Rol.COMPRADOR, ["cancelar"]),
            (Pedido.Estado.EN_PREPARACION, Usuario.Rol.VENDEDOR, ["enviar", "cancelar"]),
            (Pedido.Estado.EN_CAMINO, Usuario.Rol.COMPRADOR, ["entregar", "no-recibido"]),
            (Pedido.Estado.EN_CAMINO, Usuario.Rol.VENDEDOR, []),
            (Pedido.Estado.EN_CAMINO, Usuario.Rol.ADMINISTRADOR, ["entregar", "no-recibido"]),
            (Pedido.Estado.ENTREGADO, Usuario.Rol.COMPRADOR, []),
            (Pedido.Estado.ENTREGADO, Usuario.Rol.ADMINISTRADOR, []),
            (Pedido.Estado.CANCELADO, Usuario.Rol.COMPRADOR, []),
            (Pedido.Estado.CANCELADO, Usuario.Rol.VENDEDOR, []),
        ],
    )
    def test_matriz_estado_rol(self, estado, rol, esperadas, comprador, vendedor, admin, puesto):
        actores = {
            Usuario.Rol.COMPRADOR: comprador,
            Usuario.Rol.VENDEDOR: vendedor,
            Usuario.Rol.ADMINISTRADOR: admin,
        }
        pedido = pedido_en(estado, comprador, puesto, tipo_entrega=DOMICILIO)
        assert services.acciones_disponibles(pedido, actores[rol]) == esperadas

    @pytest.mark.parametrize(
        "estado,rol,esperadas",
        [
            (Pedido.Estado.PENDIENTE, Usuario.Rol.COMPRADOR, ["editar", "cancelar", "pagar"]),
            (Pedido.Estado.PENDIENTE, Usuario.Rol.VENDEDOR, ["confirmar", "cancelar"]),
            (Pedido.Estado.CONFIRMADO, Usuario.Rol.VENDEDOR, ["en-preparacion", "cancelar"]),
            (Pedido.Estado.EN_PREPARACION, Usuario.Rol.COMPRADOR, ["cancelar"]),
            (
                Pedido.Estado.EN_PREPARACION,
                Usuario.Rol.VENDEDOR,
                ["listo-para-recoger", "cancelar"],
            ),
            (
                Pedido.Estado.EN_PREPARACION,
                Usuario.Rol.ADMINISTRADOR,
                ["listo-para-recoger", "cancelar"],
            ),
            # Listo para recoger: el vendedor entrega (y cobra), el comprador también; nadie
            # reporta «no me ha llegado» en un retiro.
            (
                Pedido.Estado.LISTO_PARA_RECOGER,
                Usuario.Rol.COMPRADOR,
                ["entregar", "cancelar"],
            ),
            (
                Pedido.Estado.LISTO_PARA_RECOGER,
                Usuario.Rol.VENDEDOR,
                ["entregar", "cancelar"],
            ),
            (
                Pedido.Estado.LISTO_PARA_RECOGER,
                Usuario.Rol.ADMINISTRADOR,
                ["entregar", "cancelar"],
            ),
            (Pedido.Estado.ENTREGADO, Usuario.Rol.VENDEDOR, []),
            (Pedido.Estado.CANCELADO, Usuario.Rol.ADMINISTRADOR, []),
        ],
    )
    def test_matriz_estado_rol_retiro(
        self, estado, rol, esperadas, comprador, vendedor, admin, puesto
    ):
        actores = {
            Usuario.Rol.COMPRADOR: comprador,
            Usuario.Rol.VENDEDOR: vendedor,
            Usuario.Rol.ADMINISTRADOR: admin,
        }
        pedido = pedido_en(estado, comprador, puesto, tipo_entrega=Pedido.TipoEntrega.RETIRO)
        assert services.acciones_disponibles(pedido, actores[rol]) == esperadas

    def test_no_recibido_se_oculta_tras_reportar(self, comprador, puesto):
        from django.utils import timezone

        pedido = pedido_en(
            Pedido.Estado.EN_CAMINO,
            comprador,
            puesto,
            tipo_entrega=DOMICILIO,
            no_recibido_en=timezone.now(),
        )
        assert services.acciones_disponibles(pedido, comprador) == ["entregar"]

    def test_entrega_no_disponible_para_terceros(self, comprador, otro_vendedor, puesto):
        pedido = pedido_en(Pedido.Estado.EN_CAMINO, comprador, puesto, tipo_entrega=DOMICILIO)
        assert services.acciones_disponibles(pedido, otro_vendedor) == []


@pytest.mark.django_db
class TestAccionesEnApi:
    def _crear(self, estado, comprador, puesto, tipo_entrega=DOMICILIO):
        producto = ProductoFactory(id_puesto=puesto)
        return producto, pedido_en(estado, comprador, puesto, tipo_entrega=tipo_entrega)

    def test_comprador_ve_entregar_y_no_recibido(self, cliente_comprador, comprador, puesto):
        _, pedido = self._crear(Pedido.Estado.EN_CAMINO, comprador, puesto)
        respuesta = cliente_comprador.get(f"{PEDIDOS}{pedido.pk}/")
        assert respuesta.status_code == 200
        assert respuesta.data["acciones_permitidas"] == ["entregar", "no-recibido"]

    def test_vendedor_no_ve_entregar(self, cliente_vendedor, comprador, puesto):
        _, pedido = self._crear(Pedido.Estado.EN_CAMINO, comprador, puesto)
        respuesta = cliente_vendedor.get(f"{PEDIDOS}{pedido.pk}/")
        assert respuesta.status_code == 200
        assert respuesta.data["acciones_permitidas"] == []

    def test_vendedor_no_puede_entregar(self, cliente_vendedor, comprador, puesto):
        _, pedido = self._crear(Pedido.Estado.EN_CAMINO, comprador, puesto)
        respuesta = cliente_vendedor.post(f"{PEDIDOS}{pedido.pk}/entregar/", {}, format="json")
        assert respuesta.status_code == 403

    def test_comprador_no_puede_enviar(self, cliente_comprador, comprador, puesto):
        _, pedido = self._crear(Pedido.Estado.EN_PREPARACION, comprador, puesto)
        respuesta = cliente_comprador.post(f"{PEDIDOS}{pedido.pk}/enviar/", {}, format="json")
        assert respuesta.status_code == 403

    def test_administrador_no_crea_pedido(self, cliente_admin, puesto, producto):
        respuesta = cliente_admin.post(
            PEDIDOS,
            {
                "id_puesto": puesto.pk,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "items": [{"id_producto": producto.pk, "cantidad": 1}],
            },
            format="json",
        )
        assert respuesta.status_code == 403
