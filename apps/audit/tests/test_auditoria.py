"""Pruebas de auditoría: servicio, filtros, endpoint y hooks de negocio."""

from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import RequestFactory
from rest_framework import status

from apps.audit import services
from apps.audit.models import RegistroAuditoria
from tests.factories import (
    CuponFactory,
    ProductoFactory,
    PuestoFactory,
    UsuarioFactory,
    VendedorFactory,
)

from .conftest import REGISTROS


@pytest.mark.django_db
class TestServicio:
    def test_registra_con_usuario_e_ip(self, comprador):
        request = RequestFactory().get("/x", REMOTE_ADDR="10.0.0.5")
        registro = services.registrar(
            usuario=comprador,
            accion=RegistroAuditoria.Accion.CREAR,
            entidad="pedido",
            id_entidad=7,
            detalle={"total": "100.00"},
            request=request,
        )
        assert registro.pk is not None
        assert registro.id_usuario_id == comprador.pk
        assert registro.direccion_ip == "10.0.0.5"

    def test_usa_x_forwarded_for(self, comprador):
        request = RequestFactory().get("/x", HTTP_X_FORWARDED_FOR="8.8.8.8, 1.1.1.1")
        registro = services.registrar(
            usuario=comprador, accion="crear", entidad="pedido", request=request
        )
        assert registro.direccion_ip == "8.8.8.8"

    def test_sin_usuario_queda_nulo(self):
        registro = services.registrar(accion="crear", entidad="pedido")
        assert registro.id_usuario is None

    def test_usuario_anonimo_queda_nulo(self):
        from django.contrib.auth.models import AnonymousUser

        registro = services.registrar(usuario=AnonymousUser(), accion="crear", entidad="pedido")
        assert registro.id_usuario is None


@pytest.mark.django_db
class TestVisibilidad:
    def test_admin_ve_todos(self, admin):
        services.registrar(accion="crear", entidad="pedido")
        qs = services.visibles_registros(admin, RegistroAuditoria.objects.all())
        assert qs.count() == 1

    def test_no_admin_no_ve(self, comprador, vendedor):
        services.registrar(accion="crear", entidad="pedido")
        assert services.visibles_registros(comprador, RegistroAuditoria.objects.all()).count() == 0
        assert services.visibles_registros(vendedor, RegistroAuditoria.objects.all()).count() == 0

    def test_anonimo_no_ve(self):
        services.registrar(accion="crear", entidad="pedido")
        assert services.visibles_registros(None, RegistroAuditoria.objects.all()).count() == 0


@pytest.mark.django_db
class TestFiltros:
    def test_por_entidad_y_accion(self):
        services.registrar(accion="crear", entidad="pedido")
        services.registrar(accion="aprobar", entidad="pago")
        qs = services.filtrar_registros(RegistroAuditoria.objects.all(), {"entidad": "pago"})
        assert qs.count() == 1

    def test_accion_invalida(self):
        with pytest.raises(ValidationError):
            services.filtrar_registros(RegistroAuditoria.objects.all(), {"accion": "hack"})

    def test_por_usuario(self, comprador):
        services.registrar(usuario=comprador, accion="crear", entidad="pedido")
        services.registrar(accion="crear", entidad="pedido")
        qs = services.filtrar_registros(
            RegistroAuditoria.objects.all(), {"usuario": str(comprador.pk)}
        )
        assert qs.count() == 1

    def test_id_usuario_no_numerico(self):
        with pytest.raises(ValidationError):
            services.filtrar_registros(RegistroAuditoria.objects.all(), {"usuario": "abc"})

    def test_por_id_entidad(self):
        services.registrar(accion="crear", entidad="pedido", id_entidad=5)
        services.registrar(accion="crear", entidad="pedido", id_entidad=6)
        qs = services.filtrar_registros(RegistroAuditoria.objects.all(), {"id_entidad": "5"})
        assert qs.count() == 1

    def test_exigir_admin(self, comprador, admin):
        with pytest.raises(PermissionDenied):
            services.exigir_admin(comprador)
        services.exigir_admin(admin)


@pytest.mark.django_db
class TestEndpoints:
    def test_anonimo_no_lista(self, cliente_anon):
        assert cliente_anon.get(REGISTROS).status_code == status.HTTP_401_UNAUTHORIZED

    def test_comprador_no_lista(self, cliente_comprador):
        assert cliente_comprador.get(REGISTROS).status_code == status.HTTP_403_FORBIDDEN

    def test_vendedor_no_lista(self, cliente_vendedor):
        assert cliente_vendedor.get(REGISTROS).status_code == status.HTTP_403_FORBIDDEN

    def test_admin_lista_y_filtra(self, cliente_admin):
        services.registrar(accion="crear", entidad="pedido")
        services.registrar(accion="aprobar", entidad="pago")
        respuesta = cliente_admin.get(REGISTROS, {"entidad": "pago"})
        assert respuesta.status_code == status.HTTP_200_OK
        assert respuesta.data["count"] == 1
        assert respuesta.data["results"][0]["entidad"] == "pago"

    def test_admin_filtro_accion_invalida_400(self, cliente_admin):
        assert cliente_admin.get(REGISTROS, {"accion": "nope"}).status_code == (
            status.HTTP_400_BAD_REQUEST
        )


@pytest.mark.django_db
class TestHooksPedido:
    def _puesto_con_producto(self, vendedor):
        from apps.catalog.models import Categoria
        from apps.catalog.services import asignar_categoria

        puesto = PuestoFactory(id_vendedor=vendedor)
        categoria = Categoria.objects.create(nombre=f"Cat-{puesto.pk}")
        asignar_categoria(puesto=puesto, categoria=categoria)
        producto = ProductoFactory(
            id_puesto=puesto, id_categoria=categoria, precio=Decimal("1000.00")
        )
        return puesto, producto

    def test_crear_pedido_audita(self, comprador):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido

        vendedor = UsuarioFactory(rol="vendedor")
        puesto, producto = self._puesto_con_producto(vendedor)
        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        registro = RegistroAuditoria.objects.get(entidad="pedido", id_entidad=pedido.pk)
        assert registro.accion == "crear"
        assert registro.id_usuario_id == comprador.pk

    def test_transicion_audita(self, comprador):
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido
        from apps.payments import services as pagos_services
        from apps.payments.models import Pago

        vendedor = UsuarioFactory(rol="vendedor")
        VendedorFactory(id_usuario=vendedor)
        puesto, producto = self._puesto_con_producto(vendedor)
        pedido = orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        pago = pagos_services.crear_pago(
            pedido=pedido, usuario=comprador, datos={"metodo_pago": Pago.MetodoPago.SIMULADO}
        )
        pagos_services.simular_pago(pago=pago, usuario=comprador, datos={"accion": "aprobar"})
        orders_services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert RegistroAuditoria.objects.filter(entidad="pedido", accion="transicion").exists()
        assert RegistroAuditoria.objects.filter(entidad="pago", accion="aprobar").exists()


@pytest.mark.django_db
class TestHookCupon:
    def test_uso_cupon_audita(self, comprador):
        from apps.catalog.models import Categoria
        from apps.catalog.services import asignar_categoria
        from apps.orders import services as orders_services
        from apps.orders.models import Pedido

        vendedor = UsuarioFactory(rol="vendedor")
        puesto = PuestoFactory(id_vendedor=vendedor)
        categoria = Categoria.objects.create(nombre=f"Cat-{puesto.pk}")
        asignar_categoria(puesto=puesto, categoria=categoria)
        producto = ProductoFactory(
            id_puesto=puesto, id_categoria=categoria, precio=Decimal("5000.00")
        )
        cupon = CuponFactory(id_puesto=puesto, valor=Decimal("1000.00"))
        orders_services.crear_pedido(
            usuario=comprador,
            datos={
                "id_puesto": puesto,
                "tipo_entrega": Pedido.TipoEntrega.RETIRO,
                "codigo_cupon": cupon.codigo,
                "items": [{"id_producto": producto, "cantidad": 1}],
            },
        )
        assert RegistroAuditoria.objects.filter(
            entidad="cupon", accion="usar_cupon", id_entidad=cupon.pk
        ).exists()
