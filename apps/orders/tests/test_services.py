"""Pruebas aisladas de las reglas de negocio de los pedidos (services.py)."""

import pytest
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.orders import services
from apps.orders.models import Pedido
from tests.factories import ProductoFactory, PuestoFactory


def datos_pedido(puesto, lineas, **extra):
    """``lineas``: lista de ``(producto, cantidad)``."""
    datos = {
        "id_puesto": puesto,
        "tipo_entrega": Pedido.TipoEntrega.RETIRO,
        "items": [{"id_producto": producto, "cantidad": cantidad} for producto, cantidad in lineas],
    }
    datos.update(extra)
    return datos


@pytest.mark.django_db
class TestRegla4Creacion:
    def test_crea_pedido_y_descuenta_stock(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 3)])
        )
        producto.refresh_from_db()
        assert pedido.estado == Pedido.Estado.PENDIENTE
        assert producto.stock == 7
        assert pedido.items.count() == 1

    def test_congela_precio_en_el_item(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 2)])
        )
        producto.precio = "9999.00"
        producto.nombre = "Renombrado"
        producto.save()
        item = pedido.items.get()
        assert item.precio_unitario == 1500
        assert item.nombre_producto != "Renombrado"
        assert pedido.subtotal == 3000

    def test_calcula_subtotal_y_total(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 4)])
        )
        assert pedido.subtotal == 6000
        assert pedido.tarifa_domicilio == 0
        assert pedido.total == 6000
        assert pedido.items.get().subtotal == 6000

    def test_items_vacios_rechazado(self, comprador, puesto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, []))
        assert "items" in error.value.message_dict

    def test_cantidad_cero_rechazada(self, comprador, puesto, producto):
        with pytest.raises(DjangoValidationError):
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 0)]))

    def test_producto_de_otro_puesto_rechazado(self, comprador, puesto, producto, otro_vendedor):
        puesto_ajeno = PuestoFactory(id_vendedor=otro_vendedor)
        otro_producto = ProductoFactory(id_puesto=puesto_ajeno, id_categoria=producto.id_categoria)
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos=datos_pedido(puesto, [(producto, 1), (otro_producto, 1)]),
            )
        assert "no pertenece a ese puesto" in str(error.value.message_dict)

    def test_producto_inactivo_rechazado(self, comprador, puesto, producto):
        producto.estado = "inactivo"
        producto.save()
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))
        assert "no está disponible" in str(error.value.message_dict)

    def test_stock_insuficiente_no_descuenta_nada(self, comprador, puesto, producto):
        producto.stock = 2
        producto.save()
        with pytest.raises(DjangoValidationError):
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 5)]))
        producto.refresh_from_db()
        assert producto.stock == 2

    def test_stock_se_agota_entre_pedidos(self, comprador, puesto, producto):
        producto.stock = 3
        producto.save()
        services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 3)]))
        producto.refresh_from_db()
        assert producto.stock == 0
        with pytest.raises(DjangoValidationError):
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))

    def test_lineas_repetidas_se_consolidan(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(puesto, [(producto, 1), (producto, 2)]),
        )
        assert pedido.items.count() == 1
        assert pedido.items.get().cantidad == 3

    def test_puesto_suspendido_rechazado(self, comprador, puesto, producto):
        puesto.estado = "suspendido"
        puesto.save()
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))
        assert "id_puesto" in error.value.message_dict

    def test_domicilio_sin_servicio_rechazado(self, comprador, puesto, producto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos=datos_pedido(
                    puesto,
                    [(producto, 1)],
                    tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                    direccion_entrega="Calle 1 #2-3",
                ),
            )
        assert "tipo_entrega" in error.value.message_dict

    def test_domicilio_sin_direccion_rechazado(
        self, comprador, puesto_domicilio, producto_domicilio
    ):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos=datos_pedido(
                    puesto_domicilio,
                    [(producto_domicilio, 1)],
                    tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                ),
            )
        assert "direccion_entrega" in error.value.message_dict

    def test_domicilio_valido_ok(self, comprador, puesto_domicilio, producto_domicilio):
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(
                puesto_domicilio,
                [(producto_domicilio, 1)],
                tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                direccion_entrega="Calle 9 #4-20",
                referencia_entrega="Portón azul",
            ),
        )
        assert pedido.tipo_entrega == Pedido.TipoEntrega.DOMICILIO
        assert pedido.direccion_entrega == "Calle 9 #4-20"

    def test_no_comprador_no_crea(self, vendedor, puesto, producto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(usuario=vendedor, datos=datos_pedido(puesto, [(producto, 1)]))
        assert "no_autorizado" in error.value.message_dict

    def test_comprador_suspendido_no_crea(self, comprador, puesto, producto):
        comprador.suspendir()
        with pytest.raises(DjangoValidationError):
            services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))

    def test_puesto_faltante_rechazado(self, comprador, producto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos={"items": [{"id_producto": producto, "cantidad": 1}]},
            )
        assert "id_puesto" in error.value.message_dict

    def test_tipo_entrega_invalido_rechazado(self, comprador, puesto, producto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos=datos_pedido(puesto, [(producto, 1)], tipo_entrega="volador"),
            )
        assert "tipo_entrega" in error.value.message_dict

    def test_linea_sin_producto_rechazada(self, comprador, puesto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos={"id_puesto": puesto, "items": [{"cantidad": 1}]},
            )
        assert "items" in error.value.message_dict

    def test_cantidad_no_entera_rechazada(self, comprador, puesto, producto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos={
                    "id_puesto": puesto,
                    "items": [{"id_producto": producto, "cantidad": "mucho"}],
                },
            )
        assert "items" in error.value.message_dict

    def test_producto_inexistente_rechazado(self, comprador, puesto):
        with pytest.raises(DjangoValidationError) as error:
            services.crear_pedido(
                usuario=comprador,
                datos={
                    "id_puesto": puesto,
                    "items": [{"id_producto": 999999, "cantidad": 1}],
                },
            )
        assert "items" in error.value.message_dict

    def test_editar_domicilio_sin_direccion_rechazado(
        self, comprador, puesto_domicilio, producto_domicilio
    ):
        pedido = services.crear_pedido(
            usuario=comprador,
            datos=datos_pedido(
                puesto_domicilio,
                [(producto_domicilio, 1)],
                tipo_entrega=Pedido.TipoEntrega.DOMICILIO,
                direccion_entrega="Calle 9 #4-20",
            ),
        )
        with pytest.raises(DjangoValidationError) as error:
            services.actualizar_pedido(
                pedido=pedido, usuario=comprador, datos={"direccion_entrega": ""}
            )
        assert "direccion_entrega" in error.value.message_dict


@pytest.mark.django_db
class TestRegla5Transiciones:
    def test_flujo_feliz_hasta_entregado(self, comprador, vendedor, puesto, producto, aprobar_pago):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_enviado(pedido=pedido, usuario=vendedor)
        services.marcar_entregado(pedido=pedido, usuario=comprador)
        assert pedido.estado == Pedido.Estado.ENTREGADO
        assert pedido.es_final

    def test_salto_de_estado_invalido(self, comprador, vendedor, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        with pytest.raises(DjangoValidationError) as error:
            services.marcar_enviado(pedido=pedido, usuario=vendedor)
        assert "estado" in error.value.message_dict

    def test_comprador_no_confirma(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        with pytest.raises(PermissionDenied):
            services.confirmar_pedido(pedido=pedido, usuario=comprador)

    def test_vendedor_ajeno_no_confirma(self, comprador, otro_vendedor, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        with pytest.raises(PermissionDenied):
            services.confirmar_pedido(pedido=pedido, usuario=otro_vendedor)

    def test_admin_confirma(self, comprador, admin, puesto, producto, aprobar_pago):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=admin)
        assert pedido.estado == Pedido.Estado.CONFIRMADO

    def test_no_confirma_sin_pago(self, comprador, vendedor, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        with pytest.raises(DjangoValidationError) as error:
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert "pago" in error.value.message_dict

    def test_no_confirma_con_pago_sin_aprobar(self, comprador, vendedor, puesto, producto):
        from apps.payments import services as pagos_services
        from apps.payments.models import Pago

        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        pagos_services.crear_pago(
            pedido=pedido,
            usuario=comprador,
            datos={"metodo_pago": Pago.MetodoPago.SIMULADO},
        )
        with pytest.raises(DjangoValidationError) as error:
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        assert "pago" in error.value.message_dict

    def test_comprador_cancela_y_repone_stock(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 2)])
        )
        producto.refresh_from_db()
        assert producto.stock == 8
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        producto.refresh_from_db()
        assert producto.stock == 10
        assert pedido.estado == Pedido.Estado.CANCELADO

    def test_cancelar_una_sola_vez(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        services.cancelar_pedido(pedido=pedido, usuario=comprador)
        with pytest.raises(DjangoValidationError):
            services.cancelar_pedido(pedido=pedido, usuario=comprador)
        producto.refresh_from_db()
        assert producto.stock == 10  # el stock no se repone dos veces

    def test_no_se_cancela_un_pedido_entregado(
        self, comprador, vendedor, puesto, producto, aprobar_pago
    ):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        services.iniciar_preparacion(pedido=pedido, usuario=vendedor)
        services.marcar_enviado(pedido=pedido, usuario=vendedor)
        services.marcar_entregado(pedido=pedido, usuario=vendedor)
        with pytest.raises(DjangoValidationError):
            services.cancelar_pedido(pedido=pedido, usuario=vendedor)

    def test_tercero_no_cancela(self, comprador, otro_vendedor, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        with pytest.raises(PermissionDenied):
            services.cancelar_pedido(pedido=pedido, usuario=otro_vendedor)

    def test_vendedor_cancela_su_pedido(self, comprador, vendedor, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        services.cancelar_pedido(pedido=pedido, usuario=vendedor)
        assert pedido.estado == Pedido.Estado.CANCELADO

    def test_cuenta_suspendida_no_transiciona(self, comprador, vendedor, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        vendedor.suspendir()
        with pytest.raises(PermissionDenied):
            services.confirmar_pedido(pedido=pedido, usuario=vendedor)


@pytest.mark.django_db
class TestVisibilidad:
    def test_visibles_por_rol(self, comprador, vendedor, admin, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        qs = Pedido.objects.all()

        assert list(services.visibles_pedidos(comprador, qs, {})) == [pedido]
        assert list(services.visibles_pedidos(vendedor, qs, {})) == [pedido]
        assert list(services.visibles_pedidos(admin, qs, {})) == [pedido]
        assert list(services.visibles_pedidos(AnonymousUser(), qs, {})) == []

    def test_filtro_estado(self, comprador, vendedor, puesto, producto, aprobar_pago):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        aprobar_pago(pedido, comprador)
        services.confirmar_pedido(pedido=pedido, usuario=vendedor)
        qs = Pedido.objects.all()
        confirmados = services.visibles_pedidos(comprador, qs, {"estado": "confirmado"})
        pendientes = services.visibles_pedidos(comprador, qs, {"estado": "pendiente"})
        assert list(confirmados) == [pedido]
        assert list(pendientes) == []

    def test_filtro_estado_invalido(self, comprador, puesto, producto):
        services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))
        with pytest.raises(DjangoValidationError):
            services.visibles_pedidos(comprador, Pedido.objects.all(), {"estado": "inventado"})

    def test_filtros_tipo_entrega_y_puesto(self, comprador, puesto, producto):
        pedido = services.crear_pedido(
            usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)])
        )
        qs = Pedido.objects.all()
        assert list(services.visibles_pedidos(comprador, qs, {"tipo_entrega": "retiro"})) == [
            pedido
        ]
        assert list(services.visibles_pedidos(comprador, qs, {"puesto": puesto.pk})) == [pedido]
        assert list(services.visibles_pedidos(comprador, qs, {"puesto": 999999})) == []

    def test_filtro_tipo_entrega_invalido(self, comprador, puesto, producto):
        services.crear_pedido(usuario=comprador, datos=datos_pedido(puesto, [(producto, 1)]))
        with pytest.raises(DjangoValidationError) as error:
            services.visibles_pedidos(comprador, Pedido.objects.all(), {"tipo_entrega": "volo"})
        assert "tipo_entrega" in error.value.message_dict
