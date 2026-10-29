"""Pruebas del RBAC de pedidos: matriz rol x relación x acción.

Cubren ``apps.orders.permissions`` (quién PUEDE) y ``acciones_permitidas``
en la API (quién puede AHORA, según el estado del pedido).
"""

import pytest
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import PermissionDenied

from apps.accounts.models import Usuario
from apps.orders import permissions as rbac
from apps.orders import services
from apps.orders.models import Pedido
from apps.orders.permissions import Accion
from tests.factories import UsuarioFactory

from .conftest import PEDIDOS


@pytest.fixture
def pedido(comprador, puesto, producto):
    return services.crear_pedido(
        usuario=comprador,
        datos={
            "id_puesto": puesto,
            "tipo_entrega": Pedido.TipoEntrega.RETIRO,
            "items": [{"id_producto": producto, "cantidad": 1}],
        },
    )


@pytest.fixture
def otro_comprador():
    return UsuarioFactory(rol=Usuario.Rol.COMPRADOR)


# actor -> acciones que le corresponden SOBRE ESTE pedido (sin mirar el estado).
ESPERADO = {
    "comprador_del_pedido": {
        Accion.EDITAR,
        Accion.ENTREGAR,
        Accion.NO_RECIBIDO,
        Accion.CANCELAR,
    },
    "otro_comprador": set(),
    "vendedor_del_puesto": {
        Accion.CONFIRMAR,
        Accion.EN_PREPARACION,
        Accion.ENVIAR,
        Accion.CANCELAR,
    },
    "otro_vendedor": set(),
    "admin": {accion for accion in Accion if accion != Accion.CREAR},
}


@pytest.fixture
def actores(comprador, otro_comprador, vendedor, otro_vendedor, admin):
    return {
        "comprador_del_pedido": comprador,
        "otro_comprador": otro_comprador,
        "vendedor_del_puesto": vendedor,
        "otro_vendedor": otro_vendedor,
        "admin": admin,
    }


@pytest.mark.django_db
class TestMatrizRBAC:
    @pytest.mark.parametrize("actor", list(ESPERADO))
    @pytest.mark.parametrize("accion", [a for a in Accion if a != Accion.CREAR])
    def test_matriz_completa(self, actor, accion, actores, pedido):
        esperado = accion in ESPERADO[actor]
        assert rbac.puede(actores[actor], accion, pedido) is esperado

    @pytest.mark.parametrize("actor", list(ESPERADO))
    @pytest.mark.parametrize("accion", [a for a in Accion if a != Accion.CREAR])
    def test_exigir_lanza_403_cuando_no_puede(self, actor, accion, actores, pedido):
        if accion in ESPERADO[actor]:
            rbac.exigir(actores[actor], accion, pedido)
        else:
            with pytest.raises(PermissionDenied):
                rbac.exigir(actores[actor], accion, pedido)

    def test_solo_el_comprador_activo_crea(self, comprador, vendedor, admin):
        assert rbac.puede(comprador, Accion.CREAR)
        assert not rbac.puede(vendedor, Accion.CREAR)
        assert not rbac.puede(admin, Accion.CREAR)

    def test_anonimo_no_puede_nada(self, pedido):
        for accion in Accion:
            assert not rbac.puede(AnonymousUser(), accion, pedido)

    def test_cuenta_inactiva_pierde_todos_los_permisos(self, vendedor, pedido):
        vendedor.estado = Usuario.Estado.SUSPENDIDO
        vendedor.save(update_fields=["estado"])
        assert not rbac.puede(vendedor, Accion.CONFIRMAR, pedido)
        with pytest.raises(PermissionDenied):
            rbac.exigir(vendedor, Accion.CONFIRMAR, pedido)

    def test_todo_rol_conocido_tiene_entrada_en_la_matriz(self):
        assert set(rbac.PERMISOS) == set(Usuario.Rol.values)

    def test_entregar_es_solo_del_comprador_y_admin(self):
        con_permiso = {
            rol for rol, acciones in rbac.PERMISOS.items() if Accion.ENTREGAR in acciones
        }
        assert con_permiso == {Usuario.Rol.COMPRADOR, Usuario.Rol.ADMINISTRADOR}


@pytest.mark.django_db
class TestAccionesPermitidasEnApi:
    """El campo ``acciones_permitidas`` refleja RBAC + estado, por usuario."""

    @staticmethod
    def _acciones(cliente, pedido):
        respuesta = cliente.get(f"{PEDIDOS}{pedido.pk}/")
        assert respuesta.status_code == 200
        return set(respuesta.data["acciones_permitidas"])

    def test_pendiente(self, cliente_comprador, cliente_vendedor, cliente_admin, pedido):
        assert self._acciones(cliente_comprador, pedido) == {"editar", "cancelar"}
        assert self._acciones(cliente_vendedor, pedido) == {"confirmar", "cancelar"}
        assert self._acciones(cliente_admin, pedido) == {"editar", "confirmar", "cancelar"}

    def test_en_camino_reparte_los_roles_sin_conflicto(
        self,
        cliente_comprador,
        cliente_vendedor,
        cliente_admin,
        pedido,
        comprador,
        vendedor,
        aprobar_pago,
    ):
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        # En preparación el vendedor marca "en camino"; el comprador aún no entrega.
        assert "enviar" in self._acciones(cliente_vendedor, pedido)
        assert "entregar" not in self._acciones(cliente_comprador, pedido)

        services.marcar_enviado(pedido=pedido, usuario=vendedor)
        assert self._acciones(cliente_comprador, pedido) == {"entregar", "no-recibido"}
        assert self._acciones(cliente_vendedor, pedido) == set()
        assert self._acciones(cliente_admin, pedido) == {"entregar", "no-recibido"}

    def test_no_recibido_desaparece_tras_reportar(
        self, cliente_comprador, pedido, comprador, vendedor, aprobar_pago
    ):
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_enviado(pedido=pedido, usuario=vendedor)
        services.reportar_no_recibido(pedido=pedido, usuario=comprador)
        assert self._acciones(cliente_comprador, pedido) == {"entregar"}

    def test_estado_cancelado_sin_acciones(
        self, cliente_comprador, cliente_vendedor, pedido, comprador
    ):
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        assert self._acciones(cliente_comprador, pedido) == set()
        assert self._acciones(cliente_vendedor, pedido) == set()

    def test_estado_entregado_sin_acciones(
        self,
        cliente_comprador,
        cliente_vendedor,
        pedido,
        comprador,
        vendedor,
        aprobar_pago,
    ):
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_enviado(pedido=pedido, usuario=vendedor)
        services.marcar_entregado(pedido=pedido, usuario=comprador)
        assert self._acciones(cliente_comprador, pedido) == set()
        assert self._acciones(cliente_vendedor, pedido) == set()

    def test_vendedor_ajeno_no_ve_el_pedido(self, cliente_otro_vendedor, pedido):
        assert cliente_otro_vendedor.get(f"{PEDIDOS}{pedido.pk}/").status_code == 404
